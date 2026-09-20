import ReferenceCenter from "../components/ReferenceCenter";
import { helpArticles } from "../content/helpArticles";

export default function HelpCenter() {
  return <ReferenceCenter articles={helpArticles} />;
}
