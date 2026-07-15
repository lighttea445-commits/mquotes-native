#import <React/RCTBridgeModule.h>

// Objective-C bridge file required for Swift RN modules.
// This exposes WidgetBridgeModule to the React Native bridge.

RCT_EXTERN_MODULE(WidgetBridge, NSObject)

RCT_EXTERN_METHOD(
  updateWidget:(NSString *)jsonPayload
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  reloadAllTimelines:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)
