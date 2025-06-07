import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

// Definim stilurile pentru certificat
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 50,
    fontFamily: "Times-Roman",
  },
  header: {
    marginBottom: 30,
    textAlign: "center",
  },
  title: {
    fontSize: 36,
    marginBottom: 10,
    color: "#1a365d",
    textAlign: "center",
    textTransform: "uppercase",
    fontFamily: "Times-Bold",
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 20,
    color: "#2d3748",
    textAlign: "center",
    fontFamily: "Times-Italic",
  },
  content: {
    marginBottom: 30,
    textAlign: "center",
    position: "relative",
  },
  studentName: {
    fontSize: 28,
    marginBottom: 15,
    color: "#2d3748",
    textAlign: "center",
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
  },
  courseName: {
    fontSize: 24,
    marginBottom: 15,
    color: "#2d3748",
    textAlign: "center",
    fontFamily: "Times-Italic",
  },
  date: {
    fontSize: 18,
    marginBottom: 20,
    color: "#4a5568",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
  },
  certInfo: {
    flexDirection: "column",
    gap: 5,
    fontSize: 10,
    color: "#718096",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 20,
  },
  certInfoText: {
    textAlign: "center",
  },
  decorativeLine: {
    height: 2,
    backgroundColor: "#1a365d",
    marginVertical: 20,
    width: "100%",
  },
  watermark: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  seal: {
    position: "absolute",
    bottom: 100,
    right: 50,
    width: 120,
    height: 120,
    opacity: 0.8,
  },
});

interface CertificatePDFProps {
  studentName: string;
  courseName: string;
  date: string;
  certificateId: string;
  transactionHash?: string;
}

const CertificatePDF = ({
  studentName,
  courseName,
  date,
  certificateId,
  transactionHash,
}: CertificatePDFProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Watermark */}
      <View style={styles.watermark}>
        <Text
          style={{ fontSize: 100, transform: "rotate(-45deg)", opacity: 0.1 }}
        >
          QuickLearn
        </Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Certificate of Completion</Text>
        <View style={styles.decorativeLine} />
      </View>

      <View style={styles.content}>
        <Text style={styles.studentName}>{studentName}</Text>
        <Text style={styles.subtitle}>a absolvit cu succes cursul:</Text>
        <Text style={styles.courseName}>{courseName}</Text>
        <Text style={styles.date}>în data de {date}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.certInfo}>
          <Text style={styles.certInfoText}>
            Certificate ID: {certificateId}
          </Text>
          {transactionHash && (
            <Text style={styles.certInfoText}>
              Blockchain Transaction: {transactionHash}
            </Text>
          )}
        </View>
      </View>
    </Page>
  </Document>
);

export default CertificatePDF;
