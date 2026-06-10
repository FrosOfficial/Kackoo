package com.fros.kackoo.alarm;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AlarmModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private MediaPlayer mediaPlayer;

    public AlarmModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "AlarmModule";
    }

    @ReactMethod
    public void playAlarm(String soundName, boolean looping) {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            return;
        }
        try {
            Uri alertUri = null;
            if (soundName != null && !soundName.isEmpty()) {
                int resId = reactContext.getResources().getIdentifier(soundName, "raw", reactContext.getPackageName());
                if (resId != 0) {
                    alertUri = Uri.parse("android.resource://" + reactContext.getPackageName() + "/" + resId);
                }
            }
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            }
            if (alertUri == null) {
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(reactContext, alertUri);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setLooping(looping);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    public void stopAlarm() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                mediaPlayer.release();
                mediaPlayer = null;
            }
        }
    }

    @ReactMethod
    public void isAlarmPlaying(com.facebook.react.bridge.Promise promise) {
        try {
            boolean playing = (mediaPlayer != null && mediaPlayer.isPlaying());
            promise.resolve(playing);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
