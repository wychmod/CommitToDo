import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 设置状态
class AppSettings {
  const AppSettings({
    this.isDarkMode = true,
    this.themeColor = '#3B82F6',
    this.enableNotifications = true,
    this.reminderHours = 1,
    this.enableAutoBackup = false,
  });

  final bool isDarkMode;
  final String themeColor;
  final bool enableNotifications;
  final int reminderHours;
  final bool enableAutoBackup;

  AppSettings copyWith({
    bool? isDarkMode,
    String? themeColor,
    bool? enableNotifications,
    int? reminderHours,
    bool? enableAutoBackup,
  }) {
    return AppSettings(
      isDarkMode: isDarkMode ?? this.isDarkMode,
      themeColor: themeColor ?? this.themeColor,
      enableNotifications:
          enableNotifications ?? this.enableNotifications,
      reminderHours: reminderHours ?? this.reminderHours,
      enableAutoBackup:
          enableAutoBackup ?? this.enableAutoBackup,
    );
  }
}

/// 设置 Notifier
class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(const AppSettings()) {
    _load();
  }

  late final SharedPreferences _prefs;

  Future<void> _load() async {
    _prefs = await SharedPreferences.getInstance();
    state = AppSettings(
      isDarkMode: _prefs.getBool('isDarkMode') ?? true,
      themeColor:
          _prefs.getString('themeColor') ?? '#3B82F6',
      enableNotifications:
          _prefs.getBool('enableNotifications') ?? true,
      reminderHours: _prefs.getInt('reminderHours') ?? 1,
      enableAutoBackup:
          _prefs.getBool('enableAutoBackup') ?? false,
    );
  }

  Future<void> setDarkMode(bool value) async {
    state = state.copyWith(isDarkMode: value);
    await _prefs.setBool('isDarkMode', value);
  }

  Future<void> setThemeColor(String color) async {
    state = state.copyWith(themeColor: color);
    await _prefs.setString('themeColor', color);
  }

  Future<void> setNotifications(bool value) async {
    state = state.copyWith(enableNotifications: value);
    await _prefs.setBool('enableNotifications', value);
  }

  Future<void> setReminderHours(int hours) async {
    state = state.copyWith(reminderHours: hours);
    await _prefs.setInt('reminderHours', hours);
  }

  Future<void> setAutoBackup(bool value) async {
    state = state.copyWith(enableAutoBackup: value);
    await _prefs.setBool('enableAutoBackup', value);
  }
}

/// 设置 Provider
final settingsProvider =
    StateNotifierProvider<SettingsNotifier, AppSettings>(
  (ref) => SettingsNotifier(),
);
