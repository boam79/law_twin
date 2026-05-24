import "./globals.css";

export const metadata = {
  title: "LawTwin",
  description: "AI 기반 법령 영향·관계 분석 플랫폼",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
