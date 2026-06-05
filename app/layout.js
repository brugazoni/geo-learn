export const metadata = {
  title: 'AirPulse',
  description: 'Interactive experience for sonification of air quality data',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
