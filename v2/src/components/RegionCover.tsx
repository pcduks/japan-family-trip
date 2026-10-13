import Image from "next/image";
import { regionArt } from "@/lib/art";

/** A region's postcard: the woodblock illustration for that place. */
export function RegionCover({ regionId, className = "", children, sizes = "(max-width: 640px) 80vw, 400px", priority = false }: { regionId: string; className?: string; children?: React.ReactNode; sizes?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
      <Image src={regionArt(regionId)} alt="" fill sizes={sizes} className="object-cover" priority={priority} />
      {children}
    </div>
  );
}
