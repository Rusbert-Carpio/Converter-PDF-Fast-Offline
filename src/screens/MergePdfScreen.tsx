import { Platform } from 'react-native';
const Screen = Platform.OS === 'web' ? require('./MergePdfScreen.web').default : require('./MergePdfScreen.native').default;
export default Screen;
