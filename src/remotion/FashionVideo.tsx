import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, Sequence, spring } from 'remotion';

export const FashionVideo: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames, fps } = useVideoConfig();

    const images = [
        staticFile('assets/fashion/fashion_1.png'),
        staticFile('assets/fashion/fashion_2.png'),
        staticFile('assets/fashion/fashion_3.png'),
    ];

    const framesPerImage = durationInFrames / images.length;

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {images.map((img, i) => {
                const startFrame = i * framesPerImage;
                const relativeFrame = frame - startFrame;

                // Zoom Effect
                const zoom = interpolate(
                    relativeFrame,
                    [0, framesPerImage],
                    [1, 1.15],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

                // Fade Effect
                const opacity = interpolate(
                    relativeFrame,
                    [0, 20, framesPerImage - 20, framesPerImage],
                    [0, 1, 1, 0],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

                // Text slide animation
                const textOffset = spring({
                    frame: relativeFrame - 10,
                    fps,
                    config: {
                        stiffness: 100,
                        damping: 20
                    }
                });

                const textOpacity = interpolate(
                    relativeFrame,
                    [10, 30, framesPerImage - 30, framesPerImage - 10],
                    [0, 1, 1, 0],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                );

                const titles = [
                    "DIANA LOJA",
                    "MODA FEMININA",
                    "COLEÇÃO 2024"
                ];

                return (
                    <Sequence key={i} from={startFrame} durationInFrames={framesPerImage + 20}>
                        <AbsoluteFill>
                            <Img
                                src={img}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity,
                                    transform: `scale(${zoom})`,
                                }}
                            />

                            {/* Premium Overlay */}
                            <AbsoluteFill style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.4) 100%)'
                            }}>
                                <div style={{
                                    transform: `translateY(${(1 - textOffset) * 50}px)`,
                                    opacity: textOpacity,
                                    textAlign: 'center'
                                }}>
                                    <h2 style={{
                                        color: 'white',
                                        fontSize: '120px',
                                        fontWeight: 900,
                                        letterSpacing: '-0.05em',
                                        margin: 0,
                                        textTransform: 'uppercase',
                                        textShadow: '0 20px 50px rgba(0,0,0,0.3)'
                                    }}>
                                        {titles[i]}
                                    </h2>
                                    <div style={{
                                        width: '80px',
                                        height: '4px',
                                        backgroundColor: '#827b14',
                                        margin: '30px auto',
                                        borderRadius: '2px'
                                    }} />
                                </div>
                            </AbsoluteFill>
                        </AbsoluteFill>
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};
