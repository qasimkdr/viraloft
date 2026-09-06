import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const sections = [
  ['welcome', '1. Welcome'],
  ['services', '2. Services'],
  ['payments', '3. Payments'],
  ['refunds', '4. Refunds'],
  ['privacy', '5. Privacy'],
  ['security', '6. Account Security'],
  ['liability', '7. Liability'],
  ['conduct', '8. Conduct & Updates'],
  ['refill', '9. Refill / No-Refill'],
  ['speed', '10. Pricing & Speed'],
  ['links', '11. Link Validity'],
  ['service-policy', '12. Service Policy'],
  ['contact', 'Contact'],
];

export default function Terms() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <article className="legal-card !max-w-5xl">
          <span className="legal-updated">Terms and service policy</span>
          <h1>Terms &amp; Conditions</h1>
          <p>
            These terms explain how Viraloft accounts, digital services, payments, refunds, service delivery and acceptable use are handled. By using the platform, you agree to these terms and the applicable policies of the platforms connected to the services you choose.
          </p>

          <div className="legal-actions">
            <Link to="/privacy" className="primary-link">Privacy policy</Link>
            <Link to="/contact" className="secondary-link">Contact</Link>
          </div>

          <nav aria-label="Terms sections" className="my-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm font-bold text-slate-300 no-underline transition hover:border-indigo-500/50 hover:text-white">
                {label}
              </a>
            ))}
          </nav>

          <Section id="welcome" title="1. Welcome">
            <p>Viraloft provides digital services through an online panel. Users are responsible for choosing services that fit their goals and for following all applicable laws and third-party platform rules.</p>
          </Section>

          <Section id="services" title="2. Services">
            <h3>2.1 Engagement services</h3>
            <p>Some services relate to digital engagement metrics such as views, likes or followers. These services do not guarantee organic growth, monetization, revenue, ranking, account approval or any specific business outcome.</p>
            <h3>2.2 Advertising services</h3>
            <p>Where advertising-related services are offered, customers remain responsible for the content being promoted and for complying with the advertising and community policies of the relevant platform.</p>
          </Section>

          <Section id="payments" title="3. Payments">
            <List>
              <li>Orders are prepaid using the payment methods made available on the platform.</li>
              <li>Transactions may be logged for account, support, fraud-prevention and reconciliation purposes.</li>
              <li>Fraudulent activity or chargeback abuse may lead to account restrictions.</li>
            </List>
          </Section>

          <Section id="refunds" title="4. Refund & Return Policy">
            <List>
              <li>Deposits credited to a Viraloft account are generally not refundable to a bank or wallet unless required by applicable law.</li>
              <li>When an eligible guaranteed service cannot be delivered, the applicable amount may be returned to the customer&apos;s Viraloft balance.</li>
              <li>Panel balance is intended for use on Viraloft and is not normally transferable or withdrawable.</li>
              <li>Services explicitly identified as non-guaranteed or non-refill are provided subject to those limitations.</li>
            </List>
          </Section>

          <Section id="privacy" title="5. Privacy">
            <p>Personal information is handled according to the Viraloft Privacy Policy. Information may be used to operate accounts, process orders and payments, provide support, prevent abuse, maintain security and improve the service.</p>
          </Section>

          <Section id="security" title="6. Account Security">
            <List>
              <li>Keep your login credentials private and use a unique password.</li>
              <li>You are responsible for activity performed through your account unless you promptly report suspected unauthorized access.</li>
            </List>
          </Section>

          <Section id="liability" title="7. Limited Liability">
            <p>Third-party platforms control their own algorithms, moderation, reach, account restrictions and content policies. Viraloft cannot guarantee that a third-party platform will preserve content, metrics, reach or account status.</p>
          </Section>

          <Section id="conduct" title="8. User Conduct & Terms Updates">
            <List>
              <li>Users must communicate respectfully with support and staff.</li>
              <li>Abuse, fraud, attempts to compromise the service or misuse of accounts may result in restrictions or suspension.</li>
              <li>These terms may be updated as services, legal requirements or platform rules change. The current version published on this page applies.</li>
            </List>
          </Section>

          <Section id="refill" title="9. Refill & No-Refill Services">
            <p>Services marked as refill include only the refill coverage stated in their service details. Services marked as non-refill do not include refill protection unless otherwise stated.</p>
          </Section>

          <Section id="speed" title="10. Pricing & Speed">
            <List>
              <li>Prices and estimated delivery characteristics vary by service and may change.</li>
              <li>Faster or premium services may be priced differently from lower-cost options.</li>
              <li>Displayed delivery times are estimates unless a service explicitly states otherwise.</li>
            </List>
          </Section>

          <Section id="links" title="11. Link Validity & Public Access">
            <List>
              <li>Provide the correct public URL or identifier requested by the selected service.</li>
              <li>Private, deleted, restricted or incorrect links can prevent delivery.</li>
              <li>Customers should verify the target before submitting an order.</li>
            </List>
          </Section>

          <Section id="service-policy" title="12. Digital Service Delivery">
            <List>
              <li>Viraloft services are digital; no physical shipping is involved.</li>
              <li>Service-specific limits, refill coverage and other conditions shown in the catalog form part of the order information.</li>
              <li>Users should review those details before placing an order.</li>
            </List>
          </Section>

          <Section id="contact" title="Contact & Company Information">
            <p>
              <strong>Viraloft</strong><br />
              Near National Bank of Pakistan in Khan Wahan, District Naushahro Feroze<br />
              Phone: +92 316 3273012<br />
              Email: <a href="mailto:kdrqasim@gmail.com">kdrqasim@gmail.com</a>
            </p>
            <p>For account, legal or data-related inquiries, use the contact details above or the support options available on Viraloft.</p>
          </Section>

          <p className="mt-10 border-t border-slate-800 pt-5 text-xs text-slate-500">
            © {new Date().getFullYear()} Viraloft. Last updated September 2026.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-slate-800/80 py-2 first:border-0">
      <h2>{title}</h2>
      <div className="text-slate-300">{children}</div>
    </section>
  );
}

function List({ children }) {
  return <ul className="list-disc space-y-2 pl-5 leading-7">{children}</ul>;
}
