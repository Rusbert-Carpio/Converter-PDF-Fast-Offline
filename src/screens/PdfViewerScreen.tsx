import { Platform } from 'react-native';
const Screen = Platform.OS === 'web' ? require('./PdfViewerScreen.web').default : require('./PdfViewerScreen.native').default;
export default Screen;
