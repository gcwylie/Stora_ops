import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="wordmark">
          Stora <span>schema</span>
        </div>
        <h1>Log in</h1>
        <p>Östermalm and St Eriksgatan. One login for the week, the sales, and the stock count.</p>
        <LoginForm />
      </div>
    </div>
  );
}
