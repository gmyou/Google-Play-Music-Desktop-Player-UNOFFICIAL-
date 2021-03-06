import { app } from 'electron';
import _ from 'lodash';
import mpris from 'mpris-service';

function mprisService() {
  const mainWindow = WindowManager.getAll('main')[0];
  let _songInfo = {};

  const player = mpris({
    name: 'google-play-music-desktop-player',
    identity: 'Google Play Music Desktop Player',
    canRaise: true,
    supportedInterfaces: ['player'],
    desktopEntry: 'google-play-music-desktop-player',
  });
  player.playbackStatus = 'Stopped';
  player.canEditTracks = false;

  player.on('raise', () => {
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
  });

  player.on('quit', () => {
    app.quit();
  });

  player.on('play', () => {
    if (!PlaybackAPI.isPlaying()) {
      Emitter.sendToGooglePlayMusic('playback:playPause');
    }
  });

  player.on('pause', () => {
    if (PlaybackAPI.isPlaying()) {
      Emitter.sendToGooglePlayMusic('playback:playPause');
    }
  });

  player.on('playpause', () => {
    Emitter.sendToGooglePlayMusic('playback:playPause');
  });

  player.on('next', () => {
    Emitter.sendToGooglePlayMusic('playback:nextTrack');
  });

  player.on('previous', () => {
    Emitter.sendToGooglePlayMusic('playback:previousTrack');
  });

  player.on('stop', () => {
    Emitter.sendToGooglePlayMusic('playback:stop');
    player.playbackStatus = 'Stopped';
  });

  player.on('volume', (volume) => {
    Emitter.sendToGooglePlayMusic('execute:gmusic', {
      namespace: 'volume',
      method: 'setVolume',
      args: [Math.round(volume * 100)],
    });
  });

  PlaybackAPI.on('change:track', (newSong) => {
    player.canSeek = false;
    player.canPlay = true;
    player.canPause = true;
    player.canGoPrevious = true;
    player.canGoNext = true;
    player.metadata = _songInfo = {
      'mpris:artUrl': newSong.albumArt.replace('=s90', '=s300'),
      'xesam:asText': (newSong.lyrics || ''),
      'xesam:title': newSong.title,
      'xesam:album': newSong.album,
      'xesam:artist': [newSong.artist],
    };
  });

  PlaybackAPI.on('change:time', (time) => {
    const newPosition = time.current * 1e3;
    const newTotal = time.total * 1e3;
    const delta = newPosition - player.position;

    if (_songInfo && _songInfo['mpris:length'] !== newTotal) {
      player.metadata = _.extend(_songInfo, {
        'mpris:length': newTotal,
      });
    }

    if (Math.abs(delta) > 2e6) {
      player.seeked(delta);
    } else {
      player.position = newPosition;
    }
  });

  PlaybackAPI.on('change:state', (playbackState) => {
    // DEV: We skip stopped here because PlaybackAPI only shuttles true/false from GPM
    player.playbackStatus = (playbackState) ? 'Playing' : 'Paused';
  });

  PlaybackAPI.on('change:volume', (volume) => {
    player.volume = volume / 100;
  });
}

mprisService();
