import { NextPage } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AGBPage: NextPage = () => {
    return (
        <div className="bg-background min-h-screen text-on-surface">
            <Header />
            <main className="container mx-auto px-4 py-16">
                <div className="prose lg:prose-xl max-w-4xl mx-auto">
                    <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
                    <p>Stand: [Datum]</p>
                    
                    <h2>1. Geltungsbereich</h2>
                    <p>
                        Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") der [Ihr Firmenname] (nachfolgend "Verkäufer"), gelten für alle Verträge über die Lieferung von Waren, die ein Verbraucher oder Unternehmer (nachfolgend „Kunde“) mit dem Verkäufer hinsichtlich der vom Verkäufer in seinem Online-Shop dargestellten Waren abschließt.
                    </p>
                    
                    <h2>2. Vertragsschluss</h2>
                    <p>
                        Die im Online-Shop des Verkäufers enthaltenen Produktbeschreibungen stellen keine verbindlichen Angebote seitens des Verkäufers dar, sondern dienen zur Abgabe eines verbindlichen Angebots durch den Kunden.
                        Der Kunde kann das Angebot über das in den Online-Shop des Verkäufers integrierte Online-Bestellformular abgeben.
                    </p>

                    <h2>3. Preise und Zahlungsbedingungen</h2>
                    <p>
                        Sofern sich aus der Produktbeschreibung des Verkäufers nichts anderes ergibt, handelt es sich bei den angegebenen Preisen um Gesamtpreise, die die gesetzliche Umsatzsteuer enthalten. Gegebenenfalls zusätzlich anfallende Liefer- und Versandkosten werden in der jeweiligen Produktbeschreibung gesondert angegeben.
                    </p>
                    
                    {/* Fügen Sie hier weitere Abschnitte hinzu, z.B. zu Lieferung, Widerrufsrecht, Gewährleistung, etc. */}

                     <h2>4. Anwendbares Recht</h2>
                    <p>
                        Für sämtliche Rechtsbeziehungen der Parteien gilt das Recht der Bundesrepublik Deutschland unter Ausschluss der Gesetze über den internationalen Kauf beweglicher Waren.
                    </p>

                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AGBPage;
