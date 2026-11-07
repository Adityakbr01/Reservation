interface LocationMapProps {
  lat: number;
  lng: number;
  label: string;
  zoom?: number;
  className?: string;
}

/**
 * Google Maps embed with a marker at the given coordinates — no API key needed.
 */
export function LocationMap({ lat, lng, label, zoom = 13, className }: LocationMapProps) {
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div className={className ?? "h-80 w-full overflow-hidden rounded-sm border border-border"}>
      <iframe
        title={`Google Map of ${label}`}
        src={src}
        className="h-full w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default LocationMap;
