import type { Metadata } from "next";
import Link from "next/link";
import { bg, surf, bdr, ink, muted, blue } from "@/lib/constants/colors";
import { APP_NAME, APP_URL } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and protects your information.`,
  alternates: { canonical: `${APP_URL}/privacy` },
};

const LAST_UPDATED = "1 September 2026";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: ink, fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: muted, fontSize: 15, lineHeight: 1.7, marginBottom: 14 }}>{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ color: muted, fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>{children}</li>;
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <Link href="/" style={{ color: blue, fontSize: 14, textDecoration: "none" }}>&larr; {APP_NAME}</Link>

        <h1 style={{ color: ink, fontSize: 32, fontWeight: 800, marginTop: 24, marginBottom: 4 }}>
          Privacy Policy
        </h1>
        <p style={{ color: muted, fontSize: 13, marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

        <P>
          This policy explains what information {APP_NAME} collects, how we use it, and the choices
          you have — including when you choose to connect an outside account like Gmail, Slack,
          Stripe, PostHog, or Apollo to let your AI executives act on your behalf.
        </P>

        <H2>1. Information we collect</H2>
        <P><strong style={{ color: ink }}>Account information.</strong> Your name, email address, and company details when you sign up.</P>
        <P>
          <strong style={{ color: ink }}>Company and strategy data you provide.</strong> Anything you enter or
          upload to build your Strategy Session, Executive Contract, Company Context, or supporting
          documents — this is the material your AI executives reason from.
        </P>
        <P><strong style={{ color: ink }}>Usage data.</strong> How you interact with the product, for keeping it reliable and improving it.</P>
        <P>
          <strong style={{ color: ink }}>Connected account data — only if you choose to connect one.</strong> Connecting
          a third-party account is always optional and started by you. See Section 3 for exactly what
          each connection can and cannot do.
        </P>

        <H2>2. How we use information</H2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>To operate the product — generating your Management Assets, running your Operating Rhythm, and calculating your Q-Score.</Li>
          <Li>To process billing through our payment provider.</Li>
          <Li>To provide support and respond to you.</Li>
          <Li>To keep the product secure and prevent abuse.</Li>
          <Li>To improve the product over time.</Li>
        </ul>

        <H2>3. Connected third-party accounts</H2>
        <P>
          Some features let an AI executive act in a real tool on your behalf — for example, sending
          an interview invitation over Gmail, or posting a team update to Slack. Every one of these
          connections works the same way:
        </P>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li><strong style={{ color: ink }}>Opt-in, and started by you.</strong> Nothing connects automatically. You choose when to connect an account, and you can disconnect it at any time — disconnecting immediately revokes our access.</Li>
          <Li><strong style={{ color: ink }}>Least privilege.</strong> Each connection requests only the specific permission it needs — for example, permission to send email, never permission to read your inbox, unless you separately and explicitly grant that too.</Li>
          <Li><strong style={{ color: ink }}>Credentials are never stored in plain text.</strong> Access tokens are held in an encrypted secrets vault, never in a readable database column, and never logged.</Li>
          <Li><strong style={{ color: ink }}>Irreversible actions always wait for your approval.</strong> Before anything is actually sent or posted to a real person, you are shown exactly what will go out and must explicitly approve it. Nothing that leaves the product happens without that approval step.</Li>
          <Li><strong style={{ color: ink }}>You stay in control.</strong> You can review what's connected and disconnect any account at any time from your settings.</Li>
        </ul>

        <H2>4. AI processing</H2>
        <P>
          To generate your documents and prepare actions, relevant information from your account is
          sent to our AI provider (Anthropic) for processing. Per our AI provider's own policy, data
          submitted through their API is not used to train their models. AI-generated output is a
          drafting aid — you review and approve anything before it's treated as final or sent to a
          real person.
        </P>

        <H2>5. Who we share information with</H2>
        <P>We share information only with the service providers that operate the product on our behalf, and only as needed for them to perform that role:</P>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Our database, authentication, and file storage provider (Supabase).</Li>
          <Li>Our AI provider (Anthropic), for generating your documents and actions.</Li>
          <Li>Our payment processor (Stripe), for billing.</Li>
          <Li>Our transactional email provider, for account and product emails.</Li>
          <Li>Our hosting and error-monitoring providers, for keeping the product running reliably.</Li>
          <Li>Whichever third-party account you've explicitly chosen to connect (Section 3) — and only to perform the action you requested.</Li>
        </ul>
        <P>We do not sell your information. We disclose information beyond the above only if required by law.</P>

        <H2>6. Data security</H2>
        <P>
          Your data is protected by row-level access controls, so your records are only ever
          readable by you. Connected-account credentials are held in a dedicated secrets vault,
          separate from the rest of the database, and are never written to application logs.
        </P>

        <H2>7. Data retention</H2>
        <P>
          We keep your information for as long as your account is active. If you delete your
          account, we delete or anonymize your data within a reasonable period, except where we're
          required to keep it for legal, security, or accounting reasons.
        </P>

        <H2>8. Your rights and choices</H2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <Li>Access, correct, or delete your information.</Li>
          <Li>Disconnect any connected account at any time.</Li>
          <Li>Request a copy of your data.</Li>
          <Li>Close your account entirely.</Li>
        </ul>
        <P>To exercise any of these, contact us using the details below.</P>

        <H2>9. Children's privacy</H2>
        <P>{APP_NAME} is intended for founders and business use, not for children, and we do not knowingly collect information from anyone under 16.</P>

        <H2>10. International data transfers</H2>
        <P>Your information may be processed in a country other than your own. Where that happens, we rely on our service providers' own appropriate safeguards for that transfer.</P>

        <H2>11. Changes to this policy</H2>
        <P>If we make a material change to this policy, we'll update the date at the top of this page and, where appropriate, let you know directly.</P>

        <H2>12. Contact us</H2>
        <P>
          Questions about this policy or your data — write to{" "}
          <a href="mailto:privacy@edgealpha.vc" style={{ color: blue }}>privacy@edgealpha.vc</a>.
        </P>
      </div>
    </div>
  );
}
