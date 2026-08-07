import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "oklch(0.94 0.035 250)",
          "--normal-text": "oklch(0.30 0.10 250)",
          "--normal-border": "oklch(0.78 0.09 250)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "ats-toast",
          title: "ats-toast-title",
          description: "ats-toast-description",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
