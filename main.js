// Abwarten, bis das gesamte HTML-Dokument geladen ist, bevor wir das Skript ausführen
document.addEventListener("DOMContentLoaded", function() {
    // Konfiguration des Test-Brokers
    const brokerUrl="ws://broker.hivemq.com:8000/mqtt"; // Sicherer WebSocket-Broker
    const topic="automation/mqttjs"; // Test-Topic, dem wir Nachrichten senden und empfangen

    // Elemente aus dem HTML-Dokument abrufen
    const statusElement = document.getElementById("status");
    const temperatureCanvas = document.getElementById("temperatureChart"); // Canvas für das Temperaturdiagramm
    // Globale Chart-Variable
    let temperatureChart; // Zugriff von überall
    // MQTT-Client erstellen
    console.log("Versuche mit dem MQTT-Broker zu verbinden...");
    statusElement.textContent = "Verbinde mit " + brokerUrl + "...";

    const client = mqtt.connect(brokerUrl);

    // Event-Handler definieren
    // Bei erfolgreichem Verbindungsaufbau
    client.on("connect", () => {
        console.log("Erfolgreich mit dem Broker verbunden.");
        statusElement.textContent="Verbunden!";
        statusElement.style.color = "green"; // Statusfarbe auf grün setzen
        // Chart initialisieren sobald die Verbindung steht
        initializeChart();
        // Abonnieren des Test-Topics
        client.subscribe(topic, (err) => {
            if(!err) {
                console.log(`Topic "${topic}" abonniert.`);
            } else{
                console.error("Fehler beim Abonnieren des Topics:", err);
            }
         });
    });

    // Bei Empfang einer Nachricht
    client.on("message", (receivedTopic, message) => {
        console.log(`Nachricht empfangen auf Topic "${receivedTopic}":`, message.toString());
        // Daten an Chart übergeben
        updateChart(message.toString());
    });

    // Bei Verbindungsfehler
    client.on("error", (err) => {
        console.error("Verbindungsfehler:", err);
        statusElement.textContent = "Verbindungsfehler!";
        statusElement.style.color = "red"; // Statusfarbe auf rot setzen
        client.end(); // Verbindung schließen
    });

    // Chart Funtionen
    function initializeChart() {
        if (temperatureChart) {
            temperatureChart.destroy(); // Vorhandenes Diagramm zerstören, falls vorhanden
        }
        const ctx = temperatureCanvas.getContext("2d"); // 2D-Zeichenkontext des Canvas abrufen
        temperatureChart = new Chart(ctx, {
            type: "line", // Liniendiagramm, Diagrammtyp
            data: {
                labels: [], // X-Achsen-Beschriftungen (Zeitstempel), am Anfang leer
                datasets: [{
                    label: "Temperatur (°C)", // Beschriftung der Datenreihe
                    data: [], // Y-Achse, Temperaturwerte (Messdaten), am Anfang leer
                    borderColor: "rgba(255,99,132,1)", // Linienfarbe
                    backgroundColor: "rgba(255,99,132,0.2)", // Füllfarbe unter der Linie
                    borderWidth: 2, // Linienstärke
                    tension: 0.3 // Glättung der Linie
                }]
            },
            options:{
                scales:{
                    x:{
                        ticks:{color:"#FFF"}, // X-Achsen-Beschriftungen in Weiß
                    },
                    y:{
                        beginAtZero: false, // Y-Achse muss nicht bei Null beginnen
                        ticks:{color:"#FFF"} // Y-Achsen-Beschriftungen in Weiß
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#FFF" // Legendenbeschriftungen in Weiß
                    }
                }
            }
        });
        console.log("Chart initialisiert.");
    }

    // Funktion zum Aktualisieren des Diagramms mit neuen Daten
    function updateChart(message){
        try{
            // Nachricht im JSON-Format parsen
            const data = JSON.parse(message);
            // Überprüfung, ob der Temperaturwert vorhanden ist
            if(data.temperature === undefined) {
                console.warn("Keine Temperaturdaten in der Nachricht gefunden:", data);
                return; // Keine Temperaturdaten, also nichts tun
            }

            const newValue = data.temperature; // Temperaturwert aus den Daten extrahieren
            const now = new Date(); // Aktuelle Zeit
            const timestamp = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds(); // Zeitstempel im Format HH:MM:SS

            // Daten zum Chart hinzufügen
            temperatureChart.data.labels.push(timestamp); // Zeitstempel zur X-Achse hinzufügen
            temperatureChart.data.datasets[0].data.push(newValue); // Temperaturwert zur Y-Achse hinzufügen
            // Maximale Anzahl an Datenpunkten begrenzen
            if (temperatureChart.data.labels.length > 20) {
                temperatureChart.data.labels.shift(); // Ältesten Zeitstempel entfernen
                temperatureChart.data.datasets[0].data.shift(); // Ältesten Temperaturwert entfernen
            }
            // Chart neu zeichnen um Daten anzuzeigen
            temperatureChart.update();
        } catch(e) {
            console.error("Fehler beim Verarbeiten der Nachricht:", e);
        }
    }
}); // Ende des DOMContentLoaded-Events
