import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
          background:
            "radial-gradient(ellipse at 28% 22%, #1a1108 0%, #080604 62%, #050505 100%)",
          color: "#c9a961",
          fontFamily: "serif",
          fontSize: 42,
          letterSpacing: "-0.06em",
          fontWeight: 400,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 5,
            border: "1px solid rgba(201,169,97,0.32)",
            borderRadius: 11,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 11,
            top: 11,
            width: 6,
            height: 6,
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
