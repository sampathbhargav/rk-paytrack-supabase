export function exportToCsv(filename, rows) {
  if (!rows || rows.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const cleanValue = String(value).replace(/"/g, '""');
          return `"${cleanValue}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}