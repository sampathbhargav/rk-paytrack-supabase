// Synthetic local PostgreSQL fixture only; every case rolls back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { getDealDueSchedule } from '../src/utils/duePaymentsUtils.js';

const quote = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const base = { id: '00000000-0000-0000-0000-000000000055', deal_tag: 'SCHEDULE-TEST',
  monthly_payment: 500, term: 4, start_date: '2024-01-31', due_day: 31, deal_type: 'In-house', payment_frequency: 'Monthly' };
const cases = [
  ['monthly month-end and leap February', {}],
  ['biweekly crosses years', {payment_frequency: 'Biweekly', first_payment_date: '2025-12-28'}],
  ['semi-monthly clamped dates', {payment_frequency: 'Semi-Monthly',first_payment_date: '2024-01-15',second_due_day: 31}],
  ['one-time first payment date', {deal_type: 'Registration Money',first_payment_date: '2024-02-20'}],
  ['cash has no installment schedule', {deal_type: 'Cash'}],
  ['explicit moved skip', {}, [{id:'00000000-0000-0000-0000-000000000056',deal_id:base.id,original_due_date:'2024-02-29',installment_no:1,amount_due:500,moved_due_date:'2024-06-30',moved_installment_no:5,skip_status:'Active'}]],
  ['cancelled skip remains due', {}, [{id:'00000000-0000-0000-0000-000000000056',deal_id:base.id,original_due_date:'2024-02-29',installment_no:1,amount_due:500,moved_due_date:'2024-06-30',moved_installment_no:5,skip_status:'Cancelled'}]],
];
const skip = (overrides = {}) => ({ id: '00000000-0000-0000-0000-000000000056', deal_id: base.id,
  original_due_date: '2024-02-29', installment_no: 1, amount_due: 500, moved_due_date: null,
  skip_status: 'Active', ...overrides });
cases.push(
  ['automatic monthly skip', {}, [skip()]],
  ['automatic skip into February', {start_date: '2023-09-30'}, [skip({original_due_date:'2023-10-31'})]],
  ['multiple automatic skips', {}, [skip(), skip({id:'00000000-0000-0000-0000-000000000057',original_due_date:'2024-03-31',installment_no:2})]],
  ['explicit then automatic skip', {}, [skip({moved_due_date:'2024-08-31'}), skip({id:'00000000-0000-0000-0000-000000000057',original_due_date:'2024-03-31',installment_no:2})]],
  ['automatic biweekly skip', {payment_frequency:'Biweekly',first_payment_date:'2025-12-28'}, [skip({original_due_date:'2025-12-28'})]],
  ['automatic semi-monthly skip', {payment_frequency:'Semi-Monthly',first_payment_date:'2024-01-15',second_due_day:31}, [skip({original_due_date:'2024-01-15'})]],
  ['reported monthly configuration with cancelled skip', {start_date:'2026-08-31'}, [skip({original_due_date:'2026-10-31',installment_no:2}), skip({id:'00000000-0000-0000-0000-000000000057',original_due_date:'2026-12-31',installment_no:4,skip_status:'Cancelled'})]],
);
const generated = [];
for (const [name, overrides, skips = []] of cases) {
  const run = () => {
    const deal = {...base,...overrides};
    const insert = (table, row) => `insert into public.${table}(${Object.keys(row).join(',')}) values(${Object.values(row).map(quote).join(',')});`;
    const sql = `begin; ${insert('deals',deal)} ${skips.map(s=>insert('payment_skips',s)).join('\n')}
      select coalesce(jsonb_agg(jsonb_build_object('dueDate',due_date,'amountDue',amount_due) order by due_date),'[]') from rk_payment_private.schedule(${quote(deal.id)}); rollback;`;
    const expected = getDealDueSchedule(deal,skips).filter(x=>!x.isSkipped)
      .map(({dueDate,amountDue})=>({dueDate,amountDue})).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    if (process.env.RK_SCHEDULE_SQL_OUTPUT) {
      generated.push(`begin; ${insert('deals',deal)} ${skips.map(s=>insert('payment_skips',s)).join('\n')}
        do $$ declare actual jsonb; begin
          select coalesce(jsonb_agg(jsonb_build_object('dueDate',due_date,'amountDue',amount_due) order by due_date),'[]') into actual from rk_payment_private.schedule(${quote(deal.id)});
          if actual <> ${quote(JSON.stringify(expected))}::jsonb then raise exception 'Schedule parity failed: %', ${quote(name)}; end if;
        end $$; rollback;`);
      return;
    }
    const output = execFileSync('/opt/homebrew/bin/psql',['-h','/tmp','-p','55439','-d','postgres','-v','ON_ERROR_STOP=1','-Atq','-f','-'],{encoding:'utf8',input:sql});
    assert.deepEqual(JSON.parse(output),expected);
  };
  if (process.env.RK_SCHEDULE_SQL_OUTPUT) run(); else test(name, run);
}
if (process.env.RK_SCHEDULE_SQL_OUTPUT) writeFileSync(process.env.RK_SCHEDULE_SQL_OUTPUT, generated.join('\n') + `\nselect ${cases.length} as schedule_parity_cases_passed;\n`);
