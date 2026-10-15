package com.memoryweaver.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.util.Locale

class VoiceModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), RecognitionListener, TextToSpeech.OnInitListener {

  private var speechRecognizer: SpeechRecognizer? = null
  private var textToSpeech: TextToSpeech? = null
  private var ttsReady = false
  private var mediaRecorder: MediaRecorder? = null
  private var currentRecordingFile: File? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  init {
    mainHandler.post {
      try {
        textToSpeech = TextToSpeech(reactContext.applicationContext, this)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  override fun getName(): String = "VoiceRecognition"

  override fun onInit(status: Int) {
    if (status == TextToSpeech.SUCCESS) {
      val viLocale = Locale("vi", "VN")
      val res = textToSpeech?.setLanguage(viLocale)
      if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
        textToSpeech?.setLanguage(Locale.getDefault())
      }
      ttsReady = true
    }
  }

  private fun sendEvent(eventName: String, params: WritableMap?) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(eventName, params)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    try {
      val available = SpeechRecognizer.isRecognitionAvailable(reactContext)
      promise.resolve(available)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun speak(text: String, promise: Promise) {
    mainHandler.post {
      try {
        if (textToSpeech != null && ttsReady) {
          textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "MW_SPEECH_${System.currentTimeMillis()}")
          promise.resolve(true)
        } else {
          promise.resolve(false)
        }
      } catch (e: Exception) {
        promise.reject("TTS_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun stopSpeaking(promise: Promise) {
    mainHandler.post {
      try {
        textToSpeech?.stop()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

  @ReactMethod
  fun startListening(options: ReadableMap?, promise: Promise) {
    val perm = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO)
    if (perm != PackageManager.PERMISSION_GRANTED) {
      promise.reject("PERMISSION_DENIED", "Chưa cấp quyền truy cập micro.")
      return
    }

    val promptText = if (options != null && options.hasKey("promptText")) options.getString("promptText") else null

    mainHandler.post {
      try {
        if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
          promise.reject("UNAVAILABLE", "Thiết bị chưa hỗ trợ Speech Recognition.")
          return@post
        }

        if (!promptText.isNullOrEmpty() && textToSpeech != null && ttsReady) {
          textToSpeech?.speak(promptText, TextToSpeech.QUEUE_FLUSH, null, "PROMPT")
        }

        speechRecognizer?.destroy()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext.applicationContext)
        speechRecognizer?.setRecognitionListener(this)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, "vi-VN")
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "vi-VN")
          putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, reactContext.packageName)
          putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
          putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)
          putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
        }

        val delay = if (!promptText.isNullOrEmpty()) 800L else 0L
        mainHandler.postDelayed({
          try {
            speechRecognizer?.startListening(intent)
            promise.resolve(true)
          } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
          }
        }, delay)
      } catch (e: Exception) {
        promise.reject("SPEECH_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun stopListening(promise: Promise) {
    mainHandler.post {
      try {
        speechRecognizer?.stopListening()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

  @ReactMethod
  fun cancelListening(promise: Promise) {
    mainHandler.post {
      try {
        speechRecognizer?.cancel()
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

  @ReactMethod
  fun startRecordingAudio(promise: Promise) {
    val perm = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO)
    if (perm != PackageManager.PERMISSION_GRANTED) {
      promise.reject("PERMISSION_DENIED", "Chưa cấp quyền truy cập micro.")
      return
    }

    mainHandler.post {
      try {
        mediaRecorder?.release()
        val file = File(reactContext.cacheDir, "voice_${System.currentTimeMillis()}.m4a")
        currentRecordingFile = file

        @Suppress("DEPRECATION")
        val recorder = MediaRecorder().apply {
          setAudioSource(MediaRecorder.AudioSource.MIC)
          setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
          setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
          setAudioSamplingRate(16000)
          setAudioEncodingBitRate(64000)
          setOutputFile(file.absolutePath)
          prepare()
          start()
        }
        mediaRecorder = recorder
        promise.resolve(file.absolutePath)
      } catch (e: Exception) {
        promise.reject("RECORD_ERROR", e.message, e)
      }
    }
  }

  @ReactMethod
  fun stopRecordingAudio(promise: Promise) {
    mainHandler.post {
      try {
        val recorder = mediaRecorder
        if (recorder != null) {
          try {
            recorder.stop()
          } catch (_: Exception) {}
          recorder.release()
          mediaRecorder = null
        }

        val file = currentRecordingFile
        if (file != null && file.exists()) {
          val bytes = file.readBytes()
          val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
          file.delete()
          currentRecordingFile = null

          val map = Arguments.createMap()
          map.putString("audioBase64", base64)
          map.putString("mimeType", "audio/mp4")
          promise.resolve(map)
        } else {
          promise.reject("NO_FILE", "Không tìm thấy file ghi âm.")
        }
      } catch (e: Exception) {
        promise.reject("STOP_RECORD_ERROR", e.message, e)
      }
    }
  }

  override fun onReadyForSpeech(params: Bundle?) {
    sendEvent("onSpeechReady", Arguments.createMap())
  }

  override fun onBeginningOfSpeech() {
    sendEvent("onSpeechStart", Arguments.createMap())
  }

  override fun onRmsChanged(rmsdB: Float) {
    val map = Arguments.createMap()
    map.putDouble("value", rmsdB.toDouble())
    sendEvent("onSpeechVolume", map)
  }

  override fun onBufferReceived(buffer: ByteArray?) {}

  override fun onEndOfSpeech() {
    sendEvent("onSpeechEnd", Arguments.createMap())
  }

  override fun onError(error: Int) {
    val msg = when (error) {
      SpeechRecognizer.ERROR_NO_MATCH -> "Không nhận diện được câu nói. Hãy nói to và rõ hơn."
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Đã tắt micro do không có giọng nói."
      SpeechRecognizer.ERROR_AUDIO -> "Lỗi thiết bị thu âm."
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Chưa cấp quyền Micro."
      SpeechRecognizer.ERROR_NETWORK -> "Lỗi kết nối mạng giọng nói."
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Hết thời gian chờ kết nối mạng."
      SpeechRecognizer.ERROR_CLIENT -> "Lỗi ứng dụng client."
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Bộ nhận diện đang bận."
      else -> "Lỗi nhận diện ($error)."
    }
    val map = Arguments.createMap()
    map.putInt("code", error)
    map.putString("message", msg)
    sendEvent("onSpeechError", map)
  }

  override fun onResults(results: Bundle?) {
    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    if (!matches.isNullOrEmpty()) {
      val map = Arguments.createMap()
      map.putString("text", matches[0])
      val arr = Arguments.createArray()
      for (m in matches) arr.pushString(m)
      map.putArray("matches", arr)
      sendEvent("onSpeechResults", map)
    } else {
      val map = Arguments.createMap()
      map.putInt("code", SpeechRecognizer.ERROR_NO_MATCH)
      map.putString("message", "Không nhận diện được giọng nói.")
      sendEvent("onSpeechError", map)
    }
  }

  override fun onPartialResults(partialResults: Bundle?) {
    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    if (!matches.isNullOrEmpty()) {
      val map = Arguments.createMap()
      map.putString("text", matches[0])
      sendEvent("onSpeechPartialResults", map)
    }
  }

  override fun onEvent(eventType: Int, params: Bundle?) {}

  override fun invalidate() {
    super.invalidate()
    mainHandler.post {
      try {
        speechRecognizer?.destroy()
        speechRecognizer = null
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        mediaRecorder?.release()
        mediaRecorder = null
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }
}
