import { registerRoot } from 'remotion';
import { Composition } from 'remotion';
import { DianaVideo } from './DianaVideo';
import { FashionVideo } from './FashionVideo';

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FashionLoop"
        component={FashionVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DianaFashionLoop"
        component={DianaVideo}
        durationInFrames={300} // 10 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);
export default RemotionRoot;
