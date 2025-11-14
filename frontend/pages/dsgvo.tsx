import { NextPage } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const DsgvoPage: NextPage = () => {
    return (
        <div className="bg-background min-h-screen text-on-surface">
            <Header />
            <main className="container mx-auto px-4 py-16">
                <div className="prose lg:prose-xl max-w-4xl mx-auto">
                    <h1>Datenschutzerklärung</h1>
                    <p>Stand: [Datum]</p>
                    
                    <h2>1. Allgemeines</h2>
                    <p>
                        Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                        Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis.
                    </p>
                    
                    <h2>2. Verantwortliche Stelle</h2>
                    <p>
                        Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:
                        <br/>
                        [Ihr Firmenname]
                        <br/>
                        [Ihre Straße und Hausnummer]
                        <br/>
                        [Ihre PLZ und Stadt]
                        <br/>
                        E-Mail: [Ihre E-Mail-Adresse]
                    </p>

                    <h2>3. Ihre Betroffenenrechte</h2>
                    <p>
                        Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:
                        <ul>
                            <li>Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung,</li>
                            <li>Berichtigung unrichtiger personenbezogener Daten,</li>
                            <li>Löschung Ihrer bei uns gespeicherten Daten,</li>
                            <li>Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen,</li>
                            <li>Widerspruch gegen die Verarbeitung Ihrer Daten bei uns und</li>
                            <li>Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben.</li>
                        </ul>
                    </p>
                    
                    {/* Fügen Sie hier weitere Abschnitte hinzu, z.B. zu Cookies, Server-Log-Dateien, Kontaktformular, etc. */}

                </div>
            </main>
            <Footer />
        </div>
    );
};

export default DsgvoPage;
