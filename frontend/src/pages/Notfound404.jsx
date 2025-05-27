import React from "react";

const Page404 = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#1e293b",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "6rem", fontWeight: "bold", margin: 0 }}>404</h1>
      <h2 style={{ fontSize: "2rem", margin: "16px 0 8px 0" }}>
        Không tìm thấy trang
      </h2>
      <p style={{ fontSize: "1.1rem", marginBottom: 24 }}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <a
        href="/Sales_page"
        style={{
          padding: "10px 24px",
          background: "#2563eb",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          transition: "background 0.2s",
        }}
      >
        Quay về trang chủ
      </a>
    </div>
  );
};

export default Page404;