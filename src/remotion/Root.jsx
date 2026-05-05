import { Composition } from 'remotion'
import { LaunchVideo } from './LaunchVideo'

export function RemotionRoot() {
  return (
    <Composition
      id="MyMundialLaunch"
      component={LaunchVideo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={480}
      defaultProps={{
        brandName: 'MyMundial',
        tagline: 'Predict the World Cup with your friends.',
      }}
    />
  )
}
