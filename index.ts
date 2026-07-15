// Register the widget background task handler before the app initialises.
// Must run at module-load time so Android can find it during headless wakes.
import './widget/widgetTaskHandler';
import 'expo-router/entry';
