import logoAsset from "@/assets/eastgate-logo-cropped.png.asset.json";

type EastgateLogoProps = {
  className?: string;
};

export function EastgateLogo({ className = "h-10 w-auto" }: EastgateLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="Eastgate Industries"
      className={`block object-contain ${className}`}
    />
  );
}