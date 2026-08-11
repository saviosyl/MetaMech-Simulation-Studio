export default function BackgroundEffects() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy">
      <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-teal/15 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-20 right-10 w-[300px] h-[300px] bg-gold/10 rounded-full blur-[100px] animate-float-delayed" />
      <div className="absolute top-1/2 right-1/4 w-[250px] h-[250px] bg-teal/[0.08] rounded-full blur-[80px] animate-pulse-glow" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
