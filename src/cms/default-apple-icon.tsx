import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          borderRadius: 36,
          background:
            "radial-gradient(ellipse at 28% 22%, #1a1108 0%, #080604 62%, #050505 100%)",
          color: "#c9a961",
          fontFamily: "serif",
          fontSize: 120,
          letterSpacing: "-0.06em",
          fontWeight: 400,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 15,
            border: "2px solid rgba(201,169,97,0.32)",
            borderRadius: 30,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 31,
            top: 31,
            width: 15,
            height: 15,
            borderRadius: 999,
            background: "#c9a961",
          }}
        />
        M
      </div>
    ),
    { ...size },
  );
}
