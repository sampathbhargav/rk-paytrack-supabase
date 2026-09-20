import ReferenceCenter from "../components/ReferenceCenter";
import { policyArticles } from "../content/policyArticles";

export default function LegalPolicies() {
  return <ReferenceCenter articles={policyArticles} policy />;
}
