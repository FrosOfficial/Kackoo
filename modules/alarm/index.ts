import { NativeModules } from "react-native";

interface AlarmModuleInterface {
  playAlarm(soundName: string, looping: boolean): void;
  stopAlarm(): void;
  isAlarmPlaying(): Promise<boolean>;
}

const { AlarmModule } = NativeModules;
export default AlarmModule as AlarmModuleInterface;
