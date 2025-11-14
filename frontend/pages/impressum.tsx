import { NextPage } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ImpressumPage: NextPage = () => {
    return (
        <div className="bg-background min-h-screen text-on-surface">
            <Header />
            <main className="container mx-auto px-4 py-16">
                <div className="prose lg:prose-xl max-w-4xl mx-auto">
                    <h1>Impressum</h1>

                    <h2>Angaben gemäß § 5 TMG</h2>
                    <p>
                        [Ihr Firmenname]
                        <br />
                        [Ihre Straße und Hausnummer]
                        <br />
                        [Ihre PLZ und Stadt]
                    </p>

                    <h2>Vertreten durch:</h2>
                    <p>[Ihr Name]</p>

                    <h2>Kontakt</h2>
                    <p>
                        Telefon: [Ihre Telefonnummer]
                        <br />
                        E-Mail: [Ihre E-Mail-Adresse]
                    </p>

                    <h2>Umsatzsteuer-ID</h2>
                    <p>
                        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
                        <br />
                        [Ihre USt-IdNr.]
                    </p>

                    <h2>EU-Streitschlichtung</h2>
                    <p>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                            https://ec.europa.eu/consumers/odr
                        </a>.
                        <br />
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>

                    <h2>Verbraucher­streit­beilegung/Universal­schlichtungs­stelle</h2>
                    <p>
                        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ImpressumPage;
