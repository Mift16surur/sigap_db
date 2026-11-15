import React from "react";

export const metadata = {
  title: "SIGAP Backend API — Clinical Decision Support & Rule Engine",
  description:
    "Serverless Backend REST API untuk Skrining Admisi Preeklamsia (PE) dan Perdarahan Pascapersalinan (HPP)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0f172a",
          color: "#f8fafc",
          margin: 0,
          padding: "2rem",
        }}
      >
        {children}
      </body>
    </html>
  );
}

