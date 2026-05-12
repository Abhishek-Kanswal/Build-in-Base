import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4 py-10">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        forceRedirectUrl="/"
        appearance={{
          variables: {
            colorBackground: "#0A0A0A",
            colorInputBackground: "#151414",
            colorInputText: "#ffffff",
            colorText: "#ffffff",
            colorTextSecondary: "#9CA3AF",
            colorPrimary: "#ffffff",
            colorNeutral: "#222222",
            borderRadius: "1rem",
          },
          elements: {
            card: "border border-[#222] bg-[#111111] shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton:
              "border border-[#222] bg-[#151414] text-white hover:bg-[#1a1919]",
            formButtonPrimary:
              "bg-white text-black hover:bg-gray-200 shadow-none",
            footerActionLink: "text-white underline underline-offset-4",
          },
        }}
      />
    </main>
  );
}
