import monitorAsset from "@/assets/monitor-globe.png.asset.json";

type EastgateLogoProps = {
  className?: string;
};

export function EastgateLogo({ className = "h-10 w-10" }: EastgateLogoProps) {
  return (
    <img
      src={monitorAsset.url}
      alt="Eastgate Industries"
      className={`block object-contain ${className}`}
    />
  );
}
