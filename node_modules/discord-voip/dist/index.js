"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AudioPlayer: () => AudioPlayer,
  AudioPlayerError: () => AudioPlayerError,
  AudioPlayerStatus: () => AudioPlayerStatus,
  AudioResource: () => AudioResource,
  NoSubscriberBehavior: () => NoSubscriberBehavior,
  PlayerSubscription: () => PlayerSubscription,
  StreamType: () => StreamType,
  VoiceConnection: () => VoiceConnection,
  VoiceConnectionDisconnectReason: () => VoiceConnectionDisconnectReason,
  VoiceConnectionStatus: () => VoiceConnectionStatus,
  createAudioPlayer: () => createAudioPlayer,
  createAudioResource: () => createAudioResource,
  entersState: () => entersState,
  getGroups: () => getGroups,
  getVoiceConnection: () => getVoiceConnection,
  getVoiceConnections: () => getVoiceConnections,
  joinVoiceChannel: () => joinVoiceChannel,
  version: () => version
});
module.exports = __toCommonJS(src_exports);

// src/VoiceConnection.ts
var import_node_events6 = require("events");

// src/DataStore.ts
var import_v10 = require("discord-api-types/v10");
function createJoinVoiceChannelPayload(config) {
  return {
    op: import_v10.GatewayOpcodes.VoiceStateUpdate,
    // eslint-disable-next-line id-length
    d: {
      guild_id: config.guildId,
      channel_id: config.channelId,
      self_deaf: config.selfDeaf,
      self_mute: config.selfMute
    }
  };
}
__name(createJoinVoiceChannelPayload, "createJoinVoiceChannelPayload");
var groups = /* @__PURE__ */ new Map();
groups.set("default", /* @__PURE__ */ new Map());
function getOrCreateGroup(group) {
  const existing = groups.get(group);
  if (existing) return existing;
  const map = /* @__PURE__ */ new Map();
  groups.set(group, map);
  return map;
}
__name(getOrCreateGroup, "getOrCreateGroup");
function getGroups() {
  return groups;
}
__name(getGroups, "getGroups");
function getVoiceConnections(group = "default") {
  return groups.get(group);
}
__name(getVoiceConnections, "getVoiceConnections");
function getVoiceConnection(guildId, group = "default") {
  return getVoiceConnections(group)?.get(guildId);
}
__name(getVoiceConnection, "getVoiceConnection");
function untrackVoiceConnection(voiceConnection) {
  return getVoiceConnections(voiceConnection.joinConfig.group)?.delete(
    voiceConnection.joinConfig.guildId
  );
}
__name(untrackVoiceConnection, "untrackVoiceConnection");
function trackVoiceConnection(voiceConnection) {
  return getOrCreateGroup(voiceConnection.joinConfig.group).set(
    voiceConnection.joinConfig.guildId,
    voiceConnection
  );
}
__name(trackVoiceConnection, "trackVoiceConnection");
var FRAME_LENGTH = 20;
var audioCycleInterval;
var nextTime = -1;
var audioPlayers = [];
function audioCycleStep() {
  if (nextTime === -1) return;
  nextTime += FRAME_LENGTH;
  const available = audioPlayers.filter((player) => player.checkPlayable());
  for (const player of available) {
    player["_stepDispatch"]();
  }
  prepareNextAudioFrame(available);
}
__name(audioCycleStep, "audioCycleStep");
function prepareNextAudioFrame(players) {
  const nextPlayer = players.shift();
  if (!nextPlayer) {
    if (nextTime >= 0) {
      audioCycleInterval = setTimeout(
        () => audioCycleStep(),
        Math.max(nextTime - Date.now(), 1)
      );
    }
    return;
  }
  nextPlayer["_stepPrepare"]();
  setImmediate(() => prepareNextAudioFrame(players));
}
__name(prepareNextAudioFrame, "prepareNextAudioFrame");
function hasAudioPlayer(target) {
  return audioPlayers.includes(target);
}
__name(hasAudioPlayer, "hasAudioPlayer");
function addAudioPlayer(player) {
  if (hasAudioPlayer(player)) return player;
  audioPlayers.push(player);
  if (audioPlayers.length === 1) {
    nextTime = Date.now();
    setImmediate(() => audioCycleStep());
  }
  return player;
}
__name(addAudioPlayer, "addAudioPlayer");
function deleteAudioPlayer(player) {
  const index = audioPlayers.indexOf(player);
  if (index === -1) return;
  audioPlayers.splice(index, 1);
  if (audioPlayers.length === 0) {
    nextTime = -1;
    if (audioCycleInterval !== void 0) clearTimeout(audioCycleInterval);
  }
}
__name(deleteAudioPlayer, "deleteAudioPlayer");

// src/networking/Networking.ts
var import_node_buffer6 = require("buffer");
var import_node_crypto = __toESM(require("crypto"));
var import_node_events5 = require("events");
var import_v82 = require("discord-api-types/voice/v8");

// src/util/Secretbox.ts
var import_node_buffer = require("buffer");
var libs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "sodium-native": /* @__PURE__ */ __name((sodium) => ({
    crypto_aead_xchacha20poly1305_ietf_encrypt: /* @__PURE__ */ __name((plaintext, additionalData, nonce2, key) => {
      const cipherText = import_node_buffer.Buffer.alloc(
        plaintext.length + sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES
      );
      sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        cipherText,
        plaintext,
        additionalData,
        null,
        nonce2,
        key
      );
      return cipherText;
    }, "crypto_aead_xchacha20poly1305_ietf_encrypt")
  }), "sodium-native"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sodium: /* @__PURE__ */ __name((sodium) => ({
    crypto_aead_xchacha20poly1305_ietf_encrypt: /* @__PURE__ */ __name((plaintext, additionalData, nonce2, key) => {
      return sodium.api.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        additionalData,
        null,
        nonce2,
        key
      );
    }, "crypto_aead_xchacha20poly1305_ietf_encrypt")
  }), "sodium"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "libsodium-wrappers": /* @__PURE__ */ __name((sodium) => ({
    crypto_aead_xchacha20poly1305_ietf_encrypt: /* @__PURE__ */ __name((plaintext, additionalData, nonce2, key) => {
      return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        additionalData,
        null,
        nonce2,
        key
      );
    }, "crypto_aead_xchacha20poly1305_ietf_encrypt")
  }), "libsodium-wrappers"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "@stablelib/xchacha20poly1305": /* @__PURE__ */ __name((stablelib) => ({
    crypto_aead_xchacha20poly1305_ietf_encrypt(cipherText, additionalData, nonce2, key) {
      const crypto2 = new stablelib.XChaCha20Poly1305(key);
      return crypto2.seal(nonce2, cipherText, additionalData);
    }
  }), "@stablelib/xchacha20poly1305"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  "@noble/ciphers/chacha": /* @__PURE__ */ __name((noble) => ({
    crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, additionalData, nonce2, key) {
      const chacha = noble.xchacha20poly1305(key, nonce2, additionalData);
      return chacha.encrypt(plaintext);
    }
  }), "@noble/ciphers/chacha")
};
libs["sodium-javascript"] = libs["sodium-native"];
var validLibs = Object.keys(libs);
var fallbackError = /* @__PURE__ */ __name(() => {
  throw new Error(
    `Cannot play audio as no valid encryption package is installed.
- Install one of the following packages: ${validLibs.join(", ")}
- Use the generateDependencyReport() function for more information.
`
  );
}, "fallbackError");
var methods = {
  crypto_aead_xchacha20poly1305_ietf_encrypt: fallbackError
};
void (async () => {
  for (const libName of Object.keys(libs)) {
    try {
      const lib = await import(libName);
      if (libName === "libsodium-wrappers" && lib.ready) await lib.ready;
      Object.assign(methods, libs[libName](lib));
      break;
    } catch {
    }
  }
})();

// src/util/util.ts
var noop = /* @__PURE__ */ __name(() => {
}, "noop");

// src/networking/DAVESession.ts
var import_node_buffer3 = require("buffer");
var import_node_events2 = require("events");

// src/audio/AudioPlayer.ts
var import_node_buffer2 = require("buffer");
var import_node_events = require("events");

// src/audio/AudioPlayerError.ts
var _AudioPlayerError = class _AudioPlayerError extends Error {
  constructor(error, resource) {
    super(error.message);
    /**
     * The resource associated with the audio player at the time the error was thrown.
     */
    __publicField(this, "resource");
    this.resource = resource;
    this.name = error.name;
    this.stack = error.stack;
  }
};
__name(_AudioPlayerError, "AudioPlayerError");
var AudioPlayerError = _AudioPlayerError;

// src/audio/PlayerSubscription.ts
var _PlayerSubscription = class _PlayerSubscription {
  constructor(connection, player) {
    /**
     * The voice connection of this subscription.
     */
    __publicField(this, "connection");
    /**
     * The audio player of this subscription.
     */
    __publicField(this, "player");
    this.connection = connection;
    this.player = player;
  }
  /**
   * Unsubscribes the connection from the audio player, meaning that the
   * audio player cannot stream audio to it until a new subscription is made.
   */
  unsubscribe() {
    this.connection["onSubscriptionRemoved"](this);
    this.player["unsubscribe"](this);
  }
};
__name(_PlayerSubscription, "PlayerSubscription");
var PlayerSubscription = _PlayerSubscription;

// src/audio/AudioPlayer.ts
var SILENCE_FRAME = import_node_buffer2.Buffer.from([248, 255, 254]);
var NoSubscriberBehavior = /* @__PURE__ */ ((NoSubscriberBehavior2) => {
  NoSubscriberBehavior2["Pause"] = "pause";
  NoSubscriberBehavior2["Play"] = "play";
  NoSubscriberBehavior2["Stop"] = "stop";
  return NoSubscriberBehavior2;
})(NoSubscriberBehavior || {});
var AudioPlayerStatus = /* @__PURE__ */ ((AudioPlayerStatus2) => {
  AudioPlayerStatus2["AutoPaused"] = "autopaused";
  AudioPlayerStatus2["Buffering"] = "buffering";
  AudioPlayerStatus2["Idle"] = "idle";
  AudioPlayerStatus2["Paused"] = "paused";
  AudioPlayerStatus2["Playing"] = "playing";
  return AudioPlayerStatus2;
})(AudioPlayerStatus || {});
function stringifyState(state) {
  return JSON.stringify({
    ...state,
    resource: Reflect.has(state, "resource"),
    stepTimeout: Reflect.has(state, "stepTimeout")
  });
}
__name(stringifyState, "stringifyState");
var _AudioPlayer = class _AudioPlayer extends import_node_events.EventEmitter {
  /**
   * Creates a new AudioPlayer.
   */
  constructor(options = {}) {
    super();
    /**
     * The state that the AudioPlayer is in.
     */
    __publicField(this, "_state");
    /**
     * A list of VoiceConnections that are registered to this AudioPlayer. The player will attempt to play audio
     * to the streams in this list.
     */
    __publicField(this, "subscribers", []);
    /**
     * The behavior that the player should follow when it enters certain situations.
     */
    __publicField(this, "behaviors");
    /**
     * The debug logger function, if debugging is enabled.
     */
    __publicField(this, "debug");
    this._state = { status: "idle" /* Idle */ };
    this.behaviors = {
      noSubscriber: "pause" /* Pause */,
      maxMissedFrames: 5,
      ...options.behaviors
    };
    this.debug = options.debug === false ? null : (message) => this.emit("debug", message);
  }
  /**
   * A list of subscribed voice connections that can currently receive audio to play.
   */
  get playable() {
    return this.subscribers.filter(
      ({ connection }) => connection.state.status === "ready" /* Ready */
    ).map(({ connection }) => connection);
  }
  /**
   * Subscribes a VoiceConnection to the audio player's play list. If the VoiceConnection is already subscribed,
   * then the existing subscription is used.
   *
   * @remarks
   * This method should not be directly called. Instead, use VoiceConnection#subscribe.
   * @param connection - The connection to subscribe
   * @returns The new subscription if the voice connection is not yet subscribed, otherwise the existing subscription
   */
  // @ts-ignore
  subscribe(connection) {
    const existingSubscription = this.subscribers.find(
      (subscription) => subscription.connection === connection
    );
    if (!existingSubscription) {
      const subscription = new PlayerSubscription(connection, this);
      this.subscribers.push(subscription);
      setImmediate(() => this.emit("subscribe", subscription));
      return subscription;
    }
    return existingSubscription;
  }
  /**
   * Unsubscribes a subscription - i.e. removes a voice connection from the play list of the audio player.
   *
   * @remarks
   * This method should not be directly called. Instead, use PlayerSubscription#unsubscribe.
   * @param subscription - The subscription to remove
   * @returns Whether or not the subscription existed on the player and was removed
   */
  // @ts-ignore
  unsubscribe(subscription) {
    const index = this.subscribers.indexOf(subscription);
    const exists = index !== -1;
    if (exists) {
      this.subscribers.splice(index, 1);
      subscription.connection.setSpeaking(false);
      this.emit("unsubscribe", subscription);
    }
    return exists;
  }
  /**
   * The state that the player is in.
   */
  get state() {
    return this._state;
  }
  /**
   * Sets a new state for the player, performing clean-up operations where necessary.
   */
  set state(newState) {
    const oldState = this._state;
    const newResource = Reflect.get(newState, "resource");
    if (oldState.status !== "idle" /* Idle */ && oldState.resource !== newResource) {
      oldState.resource.playStream.on("error", noop);
      oldState.resource.playStream.off("error", oldState.onStreamError);
      oldState.resource.audioPlayer = void 0;
      oldState.resource.playStream.destroy();
      oldState.resource.playStream.read();
    }
    if (oldState.status === "buffering" /* Buffering */ && (newState.status !== "buffering" /* Buffering */ || newState.resource !== oldState.resource)) {
      oldState.resource.playStream.off("end", oldState.onFailureCallback);
      oldState.resource.playStream.off("close", oldState.onFailureCallback);
      oldState.resource.playStream.off("finish", oldState.onFailureCallback);
      oldState.resource.playStream.off("readable", oldState.onReadableCallback);
    }
    if (newState.status === "idle" /* Idle */) {
      this._signalStopSpeaking();
      deleteAudioPlayer(this);
    }
    if (newResource) {
      addAudioPlayer(this);
    }
    const didChangeResources = oldState.status !== "idle" /* Idle */ && newState.status === "playing" /* Playing */ && oldState.resource !== newState.resource;
    this._state = newState;
    this.emit("stateChange", oldState, this._state);
    if (oldState.status !== newState.status || didChangeResources) {
      this.emit(newState.status, oldState, this._state);
    }
    this.debug?.(
      `state change:
from ${stringifyState(oldState)}
to ${stringifyState(
        newState
      )}`
    );
  }
  /**
   * Plays a new resource on the player. If the player is already playing a resource, the existing resource is destroyed
   * (it cannot be reused, even in another player) and is replaced with the new resource.
   *
   * @remarks
   * The player will transition to the Playing state once playback begins, and will return to the Idle state once
   * playback is ended.
   *
   * If the player was previously playing a resource and this method is called, the player will not transition to the
   * Idle state during the swap over.
   * @param resource - The resource to play
   * @throws Will throw if attempting to play an audio resource that has already ended, or is being played by another player
   */
  play(resource) {
    if (resource.ended) {
      throw new Error("Cannot play a resource that has already ended.");
    }
    if (resource.audioPlayer) {
      if (resource.audioPlayer === this) {
        return;
      }
      throw new Error(
        "Resource is already being played by another audio player."
      );
    }
    resource.audioPlayer = this;
    const onStreamError = /* @__PURE__ */ __name((error) => {
      if (this.state.status !== "idle" /* Idle */) {
        this.emit("error", new AudioPlayerError(error, this.state.resource));
      }
      if (this.state.status !== "idle" /* Idle */ && this.state.resource === resource) {
        this.state = {
          status: "idle" /* Idle */
        };
      }
    }, "onStreamError");
    resource.playStream.once("error", onStreamError);
    if (resource.started) {
      this.state = {
        status: "playing" /* Playing */,
        missedFrames: 0,
        playbackDuration: 0,
        resource,
        onStreamError
      };
    } else {
      const onReadableCallback = /* @__PURE__ */ __name(() => {
        if (this.state.status === "buffering" /* Buffering */ && this.state.resource === resource) {
          this.state = {
            status: "playing" /* Playing */,
            missedFrames: 0,
            playbackDuration: 0,
            resource,
            onStreamError
          };
        }
      }, "onReadableCallback");
      const onFailureCallback = /* @__PURE__ */ __name(() => {
        if (this.state.status === "buffering" /* Buffering */ && this.state.resource === resource) {
          this.state = {
            status: "idle" /* Idle */
          };
        }
      }, "onFailureCallback");
      resource.playStream.once("readable", onReadableCallback);
      resource.playStream.once("end", onFailureCallback);
      resource.playStream.once("close", onFailureCallback);
      resource.playStream.once("finish", onFailureCallback);
      this.state = {
        status: "buffering" /* Buffering */,
        resource,
        onReadableCallback,
        onFailureCallback,
        onStreamError
      };
    }
  }
  /**
   * Pauses playback of the current resource, if any.
   *
   * @param interpolateSilence - If true, the player will play 5 packets of silence after pausing to prevent audio glitches
   * @returns `true` if the player was successfully paused, otherwise `false`
   */
  pause(interpolateSilence = true) {
    if (this.state.status !== "playing" /* Playing */) return false;
    this.state = {
      ...this.state,
      status: "paused" /* Paused */,
      silencePacketsRemaining: interpolateSilence ? 5 : 0
    };
    return true;
  }
  /**
   * Unpauses playback of the current resource, if any.
   *
   * @returns `true` if the player was successfully unpaused, otherwise `false`
   */
  unpause() {
    if (this.state.status !== "paused" /* Paused */) return false;
    this.state = {
      ...this.state,
      status: "playing" /* Playing */,
      missedFrames: 0
    };
    return true;
  }
  /**
   * Stops playback of the current resource and destroys the resource. The player will either transition to the Idle state,
   * or remain in its current state until the silence padding frames of the resource have been played.
   *
   * @param force - If true, will force the player to enter the Idle state even if the resource has silence padding frames
   * @returns `true` if the player will come to a stop, otherwise `false`
   */
  stop(force = false) {
    if (this.state.status === "idle" /* Idle */) return false;
    if (force || this.state.resource.silencePaddingFrames === 0) {
      this.state = {
        status: "idle" /* Idle */
      };
    } else if (this.state.resource.silenceRemaining === -1) {
      this.state.resource.silenceRemaining = this.state.resource.silencePaddingFrames;
    }
    return true;
  }
  /**
   * Checks whether the underlying resource (if any) is playable (readable)
   *
   * @returns `true` if the resource is playable, otherwise `false`
   */
  checkPlayable() {
    const state = this._state;
    if (state.status === "idle" /* Idle */ || state.status === "buffering" /* Buffering */)
      return false;
    if (!state.resource.readable) {
      this.state = {
        status: "idle" /* Idle */
      };
      return false;
    }
    return true;
  }
  /**
   * Called roughly every 20ms by the global audio player timer. Dispatches any audio packets that are buffered
   * by the active connections of this audio player.
   */
  // @ts-ignore
  _stepDispatch() {
    const state = this._state;
    if (state.status === "idle" /* Idle */ || state.status === "buffering" /* Buffering */)
      return;
    for (const connection of this.playable) {
      connection.dispatchAudio();
    }
  }
  /**
   * Called roughly every 20ms by the global audio player timer. Attempts to read an audio packet from the
   * underlying resource of the stream, and then has all the active connections of the audio player prepare it
   * (encrypt it, append header data) so that it is ready to play at the start of the next cycle.
   */
  // @ts-ignore
  _stepPrepare() {
    const state = this._state;
    if (state.status === "idle" /* Idle */ || state.status === "buffering" /* Buffering */)
      return;
    const playable = this.playable;
    if (state.status === "autopaused" /* AutoPaused */ && playable.length > 0) {
      this.state = {
        ...state,
        status: "playing" /* Playing */,
        missedFrames: 0
      };
    }
    if (state.status === "paused" /* Paused */ || state.status === "autopaused" /* AutoPaused */) {
      if (state.silencePacketsRemaining > 0) {
        state.silencePacketsRemaining--;
        this._preparePacket(SILENCE_FRAME, playable, state);
        if (state.silencePacketsRemaining === 0) {
          this._signalStopSpeaking();
        }
      }
      return;
    }
    if (playable.length === 0) {
      if (this.behaviors.noSubscriber === "pause" /* Pause */) {
        this.state = {
          ...state,
          status: "autopaused" /* AutoPaused */,
          silencePacketsRemaining: 5
        };
        return;
      } else if (this.behaviors.noSubscriber === "stop" /* Stop */) {
        this.stop(true);
      }
    }
    const packet = state.resource.read();
    if (state.status === "playing" /* Playing */) {
      if (packet) {
        this._preparePacket(packet, playable, state);
        state.missedFrames = 0;
      } else {
        this._preparePacket(SILENCE_FRAME, playable, state);
        state.missedFrames++;
        if (state.missedFrames >= this.behaviors.maxMissedFrames) {
          this.stop();
        }
      }
    }
  }
  /**
   * Signals to all the subscribed connections that they should send a packet to Discord indicating
   * they are no longer speaking. Called once playback of a resource ends.
   */
  _signalStopSpeaking() {
    for (const { connection } of this.subscribers) {
      connection.setSpeaking(false);
    }
  }
  /**
   * Instructs the given connections to each prepare this packet to be played at the start of the
   * next cycle.
   *
   * @param packet - The Opus packet to be prepared by each receiver
   * @param receivers - The connections that should play this packet
   */
  _preparePacket(packet, receivers, state) {
    state.playbackDuration += 20;
    for (const connection of receivers) {
      connection.prepareAudioPacket(packet);
    }
  }
};
__name(_AudioPlayer, "AudioPlayer");
var AudioPlayer = _AudioPlayer;
function createAudioPlayer(options) {
  return new AudioPlayer(options);
}
__name(createAudioPlayer, "createAudioPlayer");

// src/networking/DAVESession.ts
var TRANSITION_EXPIRY = 10;
var TRANSITION_EXPIRY_PENDING_DOWNGRADE = 24;
var DEFAULT_DECRYPTION_FAILURE_TOLERANCE = 36;
var Davey;
try {
  Davey = require("@snazzah/davey");
} catch {
  Davey = new Proxy({}, {
    get(_, prop) {
      throw new Error(
        `DAVE protocol support requires the @snazzah/davey package. Please install it to use this feature.
Attempted to access property ${String(
          prop
        )} on the DAVESession (class), but Davey is not available.`
      );
    }
  });
}
function getMaxProtocolVersion() {
  return Davey.DAVE_PROTOCOL_VERSION;
}
__name(getMaxProtocolVersion, "getMaxProtocolVersion");
var _DAVESession = class _DAVESession extends import_node_events2.EventEmitter {
  constructor(protocolVersion, userId, channelId, options) {
    super();
    /**
     * The channel id represented by this session.
     */
    __publicField(this, "channelId");
    /**
     * The user id represented by this session.
     */
    __publicField(this, "userId");
    /**
     * The protocol version being used.
     */
    __publicField(this, "protocolVersion");
    /**
     * The last transition id executed.
     */
    __publicField(this, "lastTransitionId");
    /**
     * The pending transitions, mapped by their ID and the protocol version.
     */
    __publicField(this, "pendingTransitions", /* @__PURE__ */ new Map());
    /**
     * Whether this session was downgraded previously.
     */
    __publicField(this, "downgraded", false);
    /**
     * The amount of consecutive failures encountered when decrypting.
     */
    __publicField(this, "consecutiveFailures", 0);
    /**
     * The amount of consecutive failures needed to attempt to recover.
     */
    __publicField(this, "failureTolerance");
    /**
     * Whether this session is currently re-initializing due to an invalid transition.
     */
    __publicField(this, "reinitializing", false);
    /**
     * The underlying DAVE Session of this wrapper.
     */
    __publicField(this, "session");
    this.protocolVersion = protocolVersion;
    this.userId = userId;
    this.channelId = channelId;
    this.failureTolerance = options.decryptionFailureTolerance ?? DEFAULT_DECRYPTION_FAILURE_TOLERANCE;
  }
  /**
   * The current voice privacy code of the session. Will be `null` if there is no session.
   */
  get voicePrivacyCode() {
    if (this.protocolVersion === 0 || !this.session?.voicePrivacyCode) {
      return null;
    }
    return this.session.voicePrivacyCode;
  }
  /**
   * Gets the verification code for a user in the session.
   *
   * @throws Will throw if there is not an active session or the user id provided is invalid or not in the session.
   */
  async getVerificationCode(userId) {
    if (!this.session) throw new Error("Session not available");
    return this.session.getVerificationCode(userId);
  }
  /**
   * Re-initializes (or initializes) the underlying session.
   */
  reinit() {
    if (this.protocolVersion > 0) {
      if (this.session) {
        this.session.reinit(this.protocolVersion, this.userId, this.channelId);
        this.emit(
          "debug",
          `Session reinitialized for protocol version ${this.protocolVersion}`
        );
      } else {
        this.session = new Davey.DAVESession(
          this.protocolVersion,
          this.userId,
          this.channelId
        );
        this.emit(
          "debug",
          `Session initialized for protocol version ${this.protocolVersion}`
        );
      }
      this.emit("keyPackage", this.session.getSerializedKeyPackage());
    } else if (this.session) {
      this.session.reset();
      this.session.setPassthroughMode(true, TRANSITION_EXPIRY);
      this.emit("debug", "Session reset");
    }
  }
  /**
   * Set the external sender for this session.
   *
   * @param externalSender - The external sender
   */
  setExternalSender(externalSender) {
    if (!this.session) throw new Error("No session available");
    this.session.setExternalSender(externalSender);
    this.emit("debug", "Set MLS external sender");
  }
  /**
   * Prepare for a transition.
   *
   * @param data - The transition data
   * @returns Whether we should signal to the voice server that we are ready
   */
  prepareTransition(data) {
    this.emit(
      "debug",
      `Preparing for transition (${data.transition_id}, v${data.protocol_version})`
    );
    this.pendingTransitions.set(data.transition_id, data.protocol_version);
    if (data.transition_id === 0) {
      this.executeTransition(data.transition_id);
    } else {
      if (data.protocol_version === 0)
        this.session?.setPassthroughMode(
          true,
          TRANSITION_EXPIRY_PENDING_DOWNGRADE
        );
      return true;
    }
    return false;
  }
  /**
   * Execute a transition.
   *
   * @param transitionId - The transition id to execute on
   */
  executeTransition(transitionId) {
    this.emit("debug", `Executing transition (${transitionId})`);
    if (!this.pendingTransitions.has(transitionId)) {
      this.emit(
        "debug",
        `Received execute transition, but we don't have a pending transition for ${transitionId}`
      );
      return false;
    }
    const oldVersion = this.protocolVersion;
    this.protocolVersion = this.pendingTransitions.get(transitionId);
    if (oldVersion !== this.protocolVersion && this.protocolVersion === 0) {
      this.downgraded = true;
      this.emit("debug", "Session downgraded");
    } else if (transitionId > 0 && this.downgraded) {
      this.downgraded = false;
      this.session?.setPassthroughMode(true, TRANSITION_EXPIRY);
      this.emit("debug", "Session upgraded");
    }
    this.reinitializing = false;
    this.lastTransitionId = transitionId;
    this.emit(
      "debug",
      `Transition executed (v${oldVersion} -> v${this.protocolVersion}, id: ${transitionId})`
    );
    this.pendingTransitions.delete(transitionId);
    return true;
  }
  /**
   * Prepare for a new epoch.
   *
   * @param data - The epoch data
   */
  prepareEpoch(data) {
    this.emit("debug", `Preparing for epoch (${data.epoch})`);
    if (data.epoch === 1) {
      this.protocolVersion = data.protocol_version;
      this.reinit();
    }
  }
  /**
   * Recover from an invalid transition by re-initializing.
   *
   * @param transitionId - The transition id to invalidate
   */
  recoverFromInvalidTransition(transitionId) {
    if (this.reinitializing) return;
    this.emit("debug", `Invalidating transition ${transitionId}`);
    this.reinitializing = true;
    this.consecutiveFailures = 0;
    this.emit("invalidateTransition", transitionId);
    this.reinit();
  }
  /**
   * Processes proposals from the MLS group.
   *
   * @param payload - The binary message payload
   * @param connectedClients - The set of connected client IDs
   * @returns The payload to send back to the voice server, if there is one
   */
  processProposals(payload, connectedClients) {
    if (!this.session) throw new Error("No session available");
    const optype = payload.readUInt8(0);
    const { commit, welcome } = this.session.processProposals(
      optype,
      payload.subarray(1),
      Array.from(connectedClients)
    );
    this.emit("debug", "MLS proposals processed");
    if (!commit) return;
    return welcome ? import_node_buffer3.Buffer.concat([commit, welcome]) : commit;
  }
  /**
   * Processes a commit from the MLS group.
   *
   * @param payload - The payload
   * @returns The transaction id and whether it was successful
   */
  processCommit(payload) {
    if (!this.session) throw new Error("No session available");
    const transitionId = payload.readUInt16BE(0);
    try {
      this.session.processCommit(payload.subarray(2));
      if (transitionId === 0) {
        this.reinitializing = false;
        this.lastTransitionId = transitionId;
      } else {
        this.pendingTransitions.set(transitionId, this.protocolVersion);
      }
      this.emit(
        "debug",
        `MLS commit processed (transition id: ${transitionId})`
      );
      return { transitionId, success: true };
    } catch (error) {
      this.emit(
        "debug",
        `MLS commit errored from transition ${transitionId}: ${error}`
      );
      this.recoverFromInvalidTransition(transitionId);
      return { transitionId, success: false };
    }
  }
  /**
   * Processes a welcome from the MLS group.
   *
   * @param payload - The payload
   * @returns The transaction id and whether it was successful
   */
  processWelcome(payload) {
    if (!this.session) throw new Error("No session available");
    const transitionId = payload.readUInt16BE(0);
    try {
      this.session.processWelcome(payload.subarray(2));
      if (transitionId === 0) {
        this.reinitializing = false;
        this.lastTransitionId = transitionId;
      } else {
        this.pendingTransitions.set(transitionId, this.protocolVersion);
      }
      this.emit(
        "debug",
        `MLS welcome processed (transition id: ${transitionId})`
      );
      return { transitionId, success: true };
    } catch (error) {
      this.emit(
        "debug",
        `MLS welcome errored from transition ${transitionId}: ${error}`
      );
      this.recoverFromInvalidTransition(transitionId);
      return { transitionId, success: false };
    }
  }
  /**
   * Encrypt a packet using end-to-end encryption.
   *
   * @param packet - The packet to encrypt
   */
  encrypt(packet) {
    if (this.protocolVersion === 0 || !this.session?.ready || packet.equals(SILENCE_FRAME))
      return packet;
    return this.session.encryptOpus(packet);
  }
  /**
   * Decrypt a packet using end-to-end encryption.
   *
   * @param packet - The packet to decrypt
   * @param userId - The user id that sent the packet
   * @returns The decrypted packet, or `null` if the decryption failed but should be ignored
   */
  decrypt(packet, userId) {
    const canDecrypt = this.session?.ready && (this.protocolVersion !== 0 || this.session?.canPassthrough(userId));
    if (packet.equals(SILENCE_FRAME) || !canDecrypt || !this.session)
      return packet;
    try {
      const buffer = this.session.decrypt(
        userId,
        // @ts-expect-error - const enum is exported and works (todo: drop const modifier on Davey end)
        Davey.MediaType.AUDIO,
        packet
      );
      this.consecutiveFailures = 0;
      return buffer;
    } catch (error) {
      if (!this.reinitializing && this.pendingTransitions.size === 0) {
        this.consecutiveFailures++;
        this.emit(
          "debug",
          `Failed to decrypt a packet (${this.consecutiveFailures} consecutive fails)`
        );
        if (this.consecutiveFailures > this.failureTolerance) {
          if (this.lastTransitionId)
            this.recoverFromInvalidTransition(this.lastTransitionId);
          else
            throw error;
        }
      } else if (this.reinitializing) {
        this.emit(
          "debug",
          "Failed to decrypt a packet (reinitializing session)"
        );
      } else if (this.pendingTransitions.size > 0) {
        this.emit(
          "debug",
          `Failed to decrypt a packet (${this.pendingTransitions.size} pending transition[s])`
        );
      }
    }
    return null;
  }
  /**
   * Resets the session.
   */
  destroy() {
    try {
      this.session?.reset();
    } catch {
    }
  }
};
__name(_DAVESession, "DAVESession");
var DAVESession = _DAVESession;

// src/networking/VoiceUDPSocket.ts
var import_node_buffer4 = require("buffer");
var import_node_dgram = require("dgram");
var import_node_events3 = require("events");
var import_node_net = require("net");
function parseLocalPacket(message) {
  const packet = import_node_buffer4.Buffer.from(message);
  const ip = packet.subarray(8, packet.indexOf(0, 8)).toString("utf8");
  if (!(0, import_node_net.isIPv4)(ip)) {
    throw new Error("Malformed IP address");
  }
  const port = packet.readUInt16BE(packet.length - 2);
  return { ip, port };
}
__name(parseLocalPacket, "parseLocalPacket");
var KEEP_ALIVE_INTERVAL = 5e3;
var MAX_COUNTER_VALUE = 2 ** 32 - 1;
var _VoiceUDPSocket = class _VoiceUDPSocket extends import_node_events3.EventEmitter {
  /**
   * Creates a new VoiceUDPSocket.
   *
   * @param remote - Details of the remote socket
   */
  constructor(remote) {
    super();
    /**
     * The underlying network Socket for the VoiceUDPSocket.
     */
    __publicField(this, "socket");
    /**
     * The socket details for Discord (remote)
     */
    __publicField(this, "remote");
    /**
     * The counter used in the keep alive mechanism.
     */
    __publicField(this, "keepAliveCounter", 0);
    /**
     * The buffer used to write the keep alive counter into.
     */
    __publicField(this, "keepAliveBuffer");
    /**
     * The Node.js interval for the keep-alive mechanism.
     */
    __publicField(this, "keepAliveInterval");
    /**
     * The time taken to receive a response to keep alive messages.
     *
     * @deprecated This field is no longer updated as keep alive messages are no longer tracked.
     */
    __publicField(this, "ping");
    this.socket = (0, import_node_dgram.createSocket)("udp4");
    this.socket.on("error", (error) => this.emit("error", error));
    this.socket.on("message", (buffer) => this.onMessage(buffer));
    this.socket.on("close", () => this.emit("close"));
    this.remote = remote;
    this.keepAliveBuffer = import_node_buffer4.Buffer.alloc(8);
    this.keepAliveInterval = setInterval(
      () => this.keepAlive(),
      KEEP_ALIVE_INTERVAL
    );
    setImmediate(() => this.keepAlive());
  }
  /**
   * Called when a message is received on the UDP socket.
   *
   * @param buffer - The received buffer
   */
  onMessage(buffer) {
    this.emit("message", buffer);
  }
  /**
   * Called at a regular interval to check whether we are still able to send datagrams to Discord.
   */
  keepAlive() {
    this.keepAliveBuffer.writeUInt32LE(this.keepAliveCounter, 0);
    this.send(this.keepAliveBuffer);
    this.keepAliveCounter++;
    if (this.keepAliveCounter > MAX_COUNTER_VALUE) {
      this.keepAliveCounter = 0;
    }
  }
  /**
   * Sends a buffer to Discord.
   *
   * @param buffer - The buffer to send
   */
  send(buffer) {
    this.socket.send(buffer, this.remote.port, this.remote.ip);
  }
  /**
   * Closes the socket, the instance will not be able to be reused.
   */
  destroy() {
    try {
      this.socket.close();
    } catch {
    }
    clearInterval(this.keepAliveInterval);
  }
  /**
   * Performs IP discovery to discover the local address and port to be used for the voice connection.
   *
   * @param ssrc - The SSRC received from Discord
   */
  async performIPDiscovery(ssrc) {
    return new Promise((resolve, reject) => {
      const listener = /* @__PURE__ */ __name((message) => {
        try {
          if (message.readUInt16BE(0) !== 2) return;
          const packet = parseLocalPacket(message);
          this.socket.off("message", listener);
          resolve(packet);
        } catch {
        }
      }, "listener");
      this.socket.on("message", listener);
      this.socket.once(
        "close",
        () => reject(new Error("Cannot perform IP discovery - socket closed"))
      );
      const discoveryBuffer = import_node_buffer4.Buffer.alloc(74);
      discoveryBuffer.writeUInt16BE(1, 0);
      discoveryBuffer.writeUInt16BE(70, 2);
      discoveryBuffer.writeUInt32BE(ssrc, 4);
      this.send(discoveryBuffer);
    });
  }
};
__name(_VoiceUDPSocket, "VoiceUDPSocket");
var VoiceUDPSocket = _VoiceUDPSocket;

// src/networking/VoiceWebSocket.ts
var import_node_buffer5 = require("buffer");
var import_node_events4 = require("events");
var import_v8 = require("discord-api-types/voice/v8");
var import_ws = __toESM(require("ws"));
var _VoiceWebSocket = class _VoiceWebSocket extends import_node_events4.EventEmitter {
  /**
   * Creates a new VoiceWebSocket.
   *
   * @param address - The address to connect to
   */
  constructor(address, debug) {
    super();
    /**
     * The current heartbeat interval, if any.
     */
    __publicField(this, "heartbeatInterval");
    /**
     * The time (milliseconds since UNIX epoch) that the last heartbeat acknowledgement packet was received.
     * This is set to 0 if an acknowledgement packet hasn't been received yet.
     */
    __publicField(this, "lastHeartbeatAck");
    /**
     * The time (milliseconds since UNIX epoch) that the last heartbeat was sent. This is set to 0 if a heartbeat
     * hasn't been sent yet.
     */
    __publicField(this, "lastHeartbeatSend");
    /**
     * The number of consecutively missed heartbeats.
     */
    __publicField(this, "missedHeartbeats", 0);
    /**
     * The last recorded ping.
     */
    __publicField(this, "ping");
    /**
     * The last sequence number acknowledged from Discord. Will be `-1` if no sequence numbered messages have been received.
     */
    __publicField(this, "sequence", -1);
    /**
     * The debug logger function, if debugging is enabled.
     */
    __publicField(this, "debug");
    /**
     * The underlying WebSocket of this wrapper.
     */
    __publicField(this, "ws");
    this.ws = new import_ws.default(address);
    this.ws.onmessage = (err) => this.onMessage(err);
    this.ws.onopen = (err) => this.emit("open", err);
    this.ws.onerror = (err) => this.emit("error", err instanceof Error ? err : err.error);
    this.ws.onclose = (err) => this.emit("close", err);
    this.lastHeartbeatAck = 0;
    this.lastHeartbeatSend = 0;
    this.debug = debug ? (message) => this.emit("debug", message) : null;
  }
  /**
   * Destroys the VoiceWebSocket. The heartbeat interval is cleared, and the connection is closed.
   */
  destroy() {
    try {
      this.debug?.("destroyed");
      this.setHeartbeatInterval(-1);
      this.ws.close(1e3);
    } catch (error) {
      const err = error;
      this.emit("error", err);
    }
  }
  /**
   * Handles message events on the WebSocket. Attempts to JSON parse the messages and emit them
   * as packets. Binary messages will be parsed and emitted.
   *
   * @param event - The message event
   */
  onMessage(event) {
    if (event.data instanceof import_node_buffer5.Buffer || event.data instanceof ArrayBuffer) {
      const buffer = event.data instanceof ArrayBuffer ? import_node_buffer5.Buffer.from(event.data) : event.data;
      const seq = buffer.readUInt16BE(0);
      const op = buffer.readUInt8(2);
      const payload = buffer.subarray(3);
      this.sequence = seq;
      this.debug?.(
        `<< [bin] opcode ${op}, seq ${seq}, ${payload.byteLength} bytes`
      );
      this.emit("binary", { op, seq, payload });
      return;
    } else if (typeof event.data !== "string") {
      return;
    }
    this.debug?.(`<< ${event.data}`);
    let packet;
    try {
      packet = JSON.parse(event.data);
    } catch (error) {
      const err = error;
      this.emit("error", err);
      return;
    }
    if (packet.seq) {
      this.sequence = packet.seq;
    }
    if (packet.op === import_v8.VoiceOpcodes.HeartbeatAck) {
      this.lastHeartbeatAck = Date.now();
      this.missedHeartbeats = 0;
      this.ping = this.lastHeartbeatAck - this.lastHeartbeatSend;
    }
    this.emit("packet", packet);
  }
  /**
   * Sends a JSON-stringifiable packet over the WebSocket.
   *
   * @param packet - The packet to send
   */
  sendPacket(packet) {
    try {
      const stringified = JSON.stringify(packet);
      this.debug?.(`>> ${stringified}`);
      this.ws.send(stringified);
    } catch (error) {
      const err = error;
      this.emit("error", err);
    }
  }
  /**
   * Sends a binary message over the WebSocket.
   *
   * @param opcode - The opcode to use
   * @param payload - The payload to send
   */
  sendBinaryMessage(opcode, payload) {
    try {
      const message = import_node_buffer5.Buffer.concat([new Uint8Array([opcode]), payload]);
      this.debug?.(`>> [bin] opcode ${opcode}, ${payload.byteLength} bytes`);
      this.ws.send(message);
    } catch (error) {
      const err = error;
      this.emit("error", err);
    }
  }
  /**
   * Sends a heartbeat over the WebSocket.
   */
  sendHeartbeat() {
    this.lastHeartbeatSend = Date.now();
    this.missedHeartbeats++;
    const nonce2 = this.lastHeartbeatSend;
    this.sendPacket({
      op: import_v8.VoiceOpcodes.Heartbeat,
      // eslint-disable-next-line id-length
      d: {
        // eslint-disable-next-line id-length
        t: nonce2,
        seq_ack: this.sequence
      }
    });
  }
  /**
   * Sets/clears an interval to send heartbeats over the WebSocket.
   *
   * @param ms - The interval in milliseconds. If negative, the interval will be unset
   */
  setHeartbeatInterval(ms) {
    if (this.heartbeatInterval !== void 0)
      clearInterval(this.heartbeatInterval);
    if (ms > 0) {
      this.heartbeatInterval = setInterval(() => {
        if (this.lastHeartbeatSend !== 0 && this.missedHeartbeats >= 3) {
          this.ws.close();
          this.setHeartbeatInterval(-1);
        }
        this.sendHeartbeat();
      }, ms);
    }
  }
};
__name(_VoiceWebSocket, "VoiceWebSocket");
var VoiceWebSocket = _VoiceWebSocket;

// src/networking/Networking.ts
var CHANNELS = 2;
var TIMESTAMP_INC = 48e3 / 100 * CHANNELS;
var MAX_NONCE_SIZE = 2 ** 32 - 1;
var SUPPORTED_ENCRYPTION_MODES = [
  import_v82.VoiceEncryptionMode.AeadXChaCha20Poly1305RtpSize
];
if (import_node_crypto.default.getCiphers().includes("aes-256-gcm")) {
  SUPPORTED_ENCRYPTION_MODES.unshift(import_v82.VoiceEncryptionMode.AeadAes256GcmRtpSize);
}
var nonce = import_node_buffer6.Buffer.alloc(24);
function stringifyState2(state) {
  return JSON.stringify({
    ...state,
    ws: Reflect.has(state, "ws"),
    udp: Reflect.has(state, "udp")
  });
}
__name(stringifyState2, "stringifyState");
function chooseEncryptionMode(options) {
  const option = options.find(
    (option2) => SUPPORTED_ENCRYPTION_MODES.includes(option2)
  );
  if (!option) {
    throw new Error(
      `No compatible encryption modes. Available include: ${options.join(
        ", "
      )}`
    );
  }
  return option;
}
__name(chooseEncryptionMode, "chooseEncryptionMode");
function randomNBit(numberOfBits) {
  return Math.floor(Math.random() * 2 ** numberOfBits);
}
__name(randomNBit, "randomNBit");
var _Networking = class _Networking extends import_node_events5.EventEmitter {
  /**
   * Creates a new Networking instance.
   */
  constructor(connectionOptions, options) {
    super();
    __publicField(this, "_state");
    /**
     * The debug logger function, if debugging is enabled.
     */
    __publicField(this, "debug");
    /**
     * The options used to create this Networking instance.
     */
    __publicField(this, "options");
    this.onWsOpen = this.onWsOpen.bind(this);
    this.onChildError = this.onChildError.bind(this);
    this.onWsPacket = this.onWsPacket.bind(this);
    this.onWsBinary = this.onWsBinary.bind(this);
    this.onWsClose = this.onWsClose.bind(this);
    this.onWsDebug = this.onWsDebug.bind(this);
    this.onUdpDebug = this.onUdpDebug.bind(this);
    this.onUdpClose = this.onUdpClose.bind(this);
    this.onDaveDebug = this.onDaveDebug.bind(this);
    this.onDaveKeyPackage = this.onDaveKeyPackage.bind(this);
    this.onDaveInvalidateTransition = this.onDaveInvalidateTransition.bind(this);
    this.debug = options?.debug ? (message) => this.emit("debug", message) : null;
    this._state = {
      code: 0 /* OpeningWs */,
      ws: this.createWebSocket(connectionOptions.endpoint),
      connectionOptions
    };
    this.options = options;
  }
  /**
   * Destroys the Networking instance, transitioning it into the Closed state.
   */
  destroy() {
    this.state = {
      code: 6 /* Closed */
    };
  }
  /**
   * The current state of the networking instance.
   *
   * @remarks
   * The setter will perform clean-up operations where necessary.
   */
  get state() {
    return this._state;
  }
  set state(newState) {
    const oldWs = Reflect.get(this._state, "ws");
    const newWs = Reflect.get(newState, "ws");
    if (oldWs && oldWs !== newWs) {
      oldWs.off("debug", this.onWsDebug);
      oldWs.on("error", noop);
      oldWs.off("error", this.onChildError);
      oldWs.off("open", this.onWsOpen);
      oldWs.off("packet", this.onWsPacket);
      oldWs.off("binary", this.onWsBinary);
      oldWs.off("close", this.onWsClose);
      oldWs.destroy();
    }
    const oldUdp = Reflect.get(this._state, "udp");
    const newUdp = Reflect.get(newState, "udp");
    if (oldUdp && oldUdp !== newUdp) {
      oldUdp.on("error", noop);
      oldUdp.off("error", this.onChildError);
      oldUdp.off("close", this.onUdpClose);
      oldUdp.off("debug", this.onUdpDebug);
      oldUdp.destroy();
    }
    const oldDave = Reflect.get(this._state, "dave");
    const newDave = Reflect.get(newState, "dave");
    if (oldDave && oldDave !== newDave) {
      oldDave.off("error", this.onChildError);
      oldDave.off("debug", this.onDaveDebug);
      oldDave.off("keyPackage", this.onDaveKeyPackage);
      oldDave.off("invalidateTransition", this.onDaveInvalidateTransition);
      oldDave.destroy();
    }
    const oldState = this._state;
    this._state = newState;
    this.emit("stateChange", oldState, newState);
    this.debug?.(
      `state change:
from ${stringifyState2(oldState)}
to ${stringifyState2(
        newState
      )}`
    );
  }
  /**
   * Creates a new WebSocket to a Discord Voice gateway.
   *
   * @param endpoint - The endpoint to connect to
   * @param lastSequence - The last sequence to set for this WebSocket
   */
  createWebSocket(endpoint, lastSequence) {
    const ws = new VoiceWebSocket(`wss://${endpoint}?v=8`, Boolean(this.debug));
    if (lastSequence !== void 0) {
      ws.sequence = lastSequence;
    }
    ws.on("error", this.onChildError);
    ws.once("open", this.onWsOpen);
    ws.on("packet", this.onWsPacket);
    ws.on("binary", this.onWsBinary);
    ws.once("close", this.onWsClose);
    ws.on("debug", this.onWsDebug);
    return ws;
  }
  /**
   * Creates a new DAVE session for this voice connection if we can create one.
   *
   * @param protocolVersion - The protocol version to use
   */
  createDaveSession(protocolVersion) {
    if (this.options.daveEncryption === false || this.state.code !== 3 /* SelectingProtocol */ && this.state.code !== 4 /* Ready */ && this.state.code !== 5 /* Resuming */) {
      return;
    }
    const session = new DAVESession(
      protocolVersion,
      this.state.connectionOptions.userId,
      this.state.connectionOptions.channelId,
      {
        decryptionFailureTolerance: this.options.decryptionFailureTolerance
      }
    );
    session.on("error", this.onChildError);
    session.on("debug", this.onDaveDebug);
    session.on("keyPackage", this.onDaveKeyPackage);
    session.on("invalidateTransition", this.onDaveInvalidateTransition);
    session.reinit();
    return session;
  }
  /**
   * Propagates errors from the children VoiceWebSocket, VoiceUDPSocket and DAVESession.
   *
   * @param error - The error that was emitted by a child
   */
  onChildError(error) {
    this.emit("error", error);
  }
  /**
   * Called when the WebSocket opens. Depending on the state that the instance is in,
   * it will either identify with a new session, or it will attempt to resume an existing session.
   */
  onWsOpen() {
    if (this.state.code === 0 /* OpeningWs */) {
      this.state.ws.sendPacket({
        op: import_v82.VoiceOpcodes.Identify,
        d: {
          server_id: this.state.connectionOptions.serverId,
          user_id: this.state.connectionOptions.userId,
          session_id: this.state.connectionOptions.sessionId,
          token: this.state.connectionOptions.token,
          max_dave_protocol_version: this.options.daveEncryption === false ? 0 : getMaxProtocolVersion()
        }
      });
      this.state = {
        ...this.state,
        code: 1 /* Identifying */
      };
    } else if (this.state.code === 5 /* Resuming */) {
      this.state.ws.sendPacket({
        op: import_v82.VoiceOpcodes.Resume,
        d: {
          server_id: this.state.connectionOptions.serverId,
          session_id: this.state.connectionOptions.sessionId,
          token: this.state.connectionOptions.token,
          seq_ack: this.state.ws.sequence
        }
      });
    }
  }
  /**
   * Called when the WebSocket closes. Based on the reason for closing (given by the code parameter),
   * the instance will either attempt to resume, or enter the closed state and emit a 'close' event
   * with the close code, allowing the user to decide whether or not they would like to reconnect.
   *
   * @param code - The close code
   */
  onWsClose({ code }) {
    const canResume = code === 4015 || code < 4e3;
    if (canResume && this.state.code === 4 /* Ready */) {
      const lastSequence = this.state.ws.sequence;
      this.state = {
        ...this.state,
        code: 5 /* Resuming */,
        ws: this.createWebSocket(
          this.state.connectionOptions.endpoint,
          lastSequence
        )
      };
    } else if (this.state.code !== 6 /* Closed */) {
      this.destroy();
      this.emit("close", code);
    }
  }
  /**
   * Called when the UDP socket has closed itself if it has stopped receiving replies from Discord.
   */
  onUdpClose() {
    if (this.state.code === 4 /* Ready */) {
      const lastSequence = this.state.ws.sequence;
      this.state = {
        ...this.state,
        code: 5 /* Resuming */,
        ws: this.createWebSocket(
          this.state.connectionOptions.endpoint,
          lastSequence
        )
      };
    }
  }
  /**
   * Called when a packet is received on the connection's WebSocket.
   *
   * @param packet - The received packet
   */
  onWsPacket(packet) {
    if (packet.op === import_v82.VoiceOpcodes.Hello && this.state.code !== 6 /* Closed */) {
      this.state.ws.setHeartbeatInterval(packet.d.heartbeat_interval);
    } else if (packet.op === import_v82.VoiceOpcodes.Ready && this.state.code === 1 /* Identifying */) {
      const { ip, port, ssrc, modes } = packet.d;
      const udp = new VoiceUDPSocket({ ip, port });
      udp.on("error", this.onChildError);
      udp.on("debug", this.onUdpDebug);
      udp.once("close", this.onUdpClose);
      udp.performIPDiscovery(ssrc).then((localConfig) => {
        if (this.state.code !== 2 /* UdpHandshaking */) return;
        this.state.ws.sendPacket({
          op: import_v82.VoiceOpcodes.SelectProtocol,
          d: {
            protocol: "udp",
            data: {
              address: localConfig.ip,
              port: localConfig.port,
              mode: chooseEncryptionMode(modes)
            }
          }
        });
        this.state = {
          ...this.state,
          code: 3 /* SelectingProtocol */
        };
      }).catch((error) => this.emit("error", error));
      this.state = {
        ...this.state,
        code: 2 /* UdpHandshaking */,
        udp,
        connectionData: {
          ssrc,
          connectedClients: /* @__PURE__ */ new Set()
        }
      };
    } else if (packet.op === import_v82.VoiceOpcodes.SessionDescription && this.state.code === 3 /* SelectingProtocol */) {
      const {
        mode: encryptionMode,
        secret_key: secretKey,
        dave_protocol_version: daveProtocolVersion
      } = packet.d;
      this.state = {
        ...this.state,
        code: 4 /* Ready */,
        dave: this.createDaveSession(daveProtocolVersion),
        connectionData: {
          ...this.state.connectionData,
          encryptionMode,
          secretKey: new Uint8Array(secretKey),
          sequence: randomNBit(16),
          timestamp: randomNBit(32),
          nonce: 0,
          nonceBuffer: encryptionMode === "aead_aes256_gcm_rtpsize" ? import_node_buffer6.Buffer.alloc(12) : import_node_buffer6.Buffer.alloc(24),
          speaking: false,
          packetsPlayed: 0
        }
      };
    } else if (packet.op === import_v82.VoiceOpcodes.Resumed && this.state.code === 5 /* Resuming */) {
      this.state = {
        ...this.state,
        code: 4 /* Ready */
      };
      this.state.connectionData.speaking = false;
    } else if ((packet.op === import_v82.VoiceOpcodes.ClientsConnect || packet.op === import_v82.VoiceOpcodes.ClientDisconnect) && (this.state.code === 4 /* Ready */ || this.state.code === 2 /* UdpHandshaking */ || this.state.code === 3 /* SelectingProtocol */ || this.state.code === 5 /* Resuming */)) {
      const { connectionData } = this.state;
      if (packet.op === import_v82.VoiceOpcodes.ClientsConnect)
        for (const id of packet.d.user_ids)
          connectionData.connectedClients.add(id);
      else {
        connectionData.connectedClients.delete(packet.d.user_id);
      }
    } else if ((this.state.code === 4 /* Ready */ || this.state.code === 5 /* Resuming */) && this.state.dave) {
      if (packet.op === import_v82.VoiceOpcodes.DavePrepareTransition) {
        const sendReady = this.state.dave.prepareTransition(packet.d);
        if (sendReady)
          this.state.ws.sendPacket({
            op: import_v82.VoiceOpcodes.DaveTransitionReady,
            d: { transition_id: packet.d.transition_id }
          });
        if (packet.d.transition_id === 0) {
          this.emit("transitioned", 0);
        }
      } else if (packet.op === import_v82.VoiceOpcodes.DaveExecuteTransition) {
        const transitioned = this.state.dave.executeTransition(
          packet.d.transition_id
        );
        if (transitioned) this.emit("transitioned", packet.d.transition_id);
      } else if (packet.op === import_v82.VoiceOpcodes.DavePrepareEpoch)
        this.state.dave.prepareEpoch(packet.d);
    }
  }
  /**
   * Called when a binary message is received on the connection's WebSocket.
   *
   * @param message - The received message
   */
  onWsBinary(message) {
    if (this.state.code === 4 /* Ready */ && this.state.dave) {
      if (message.op === import_v82.VoiceOpcodes.DaveMlsExternalSender) {
        this.state.dave.setExternalSender(message.payload);
      } else if (message.op === import_v82.VoiceOpcodes.DaveMlsProposals) {
        const payload = this.state.dave.processProposals(
          message.payload,
          this.state.connectionData.connectedClients
        );
        if (payload)
          this.state.ws.sendBinaryMessage(
            import_v82.VoiceOpcodes.DaveMlsCommitWelcome,
            payload
          );
      } else if (message.op === import_v82.VoiceOpcodes.DaveMlsAnnounceCommitTransition) {
        const { transitionId, success } = this.state.dave.processCommit(
          message.payload
        );
        if (success) {
          if (transitionId === 0) this.emit("transitioned", transitionId);
          else
            this.state.ws.sendPacket({
              op: import_v82.VoiceOpcodes.DaveTransitionReady,
              d: { transition_id: transitionId }
            });
        }
      } else if (message.op === import_v82.VoiceOpcodes.DaveMlsWelcome) {
        const { transitionId, success } = this.state.dave.processWelcome(
          message.payload
        );
        if (success) {
          if (transitionId === 0) this.emit("transitioned", transitionId);
          else
            this.state.ws.sendPacket({
              op: import_v82.VoiceOpcodes.DaveTransitionReady,
              d: { transition_id: transitionId }
            });
        }
      }
    }
  }
  /**
   * Called when a new key package is ready to be sent to the voice server.
   *
   * @param keyPackage - The new key package
   */
  onDaveKeyPackage(keyPackage) {
    if (this.state.code === 3 /* SelectingProtocol */ || this.state.code === 4 /* Ready */)
      this.state.ws.sendBinaryMessage(
        import_v82.VoiceOpcodes.DaveMlsKeyPackage,
        keyPackage
      );
  }
  /**
   * Called when the DAVE session wants to invalidate their transition and re-initialize.
   *
   * @param transitionId - The transition to invalidate
   */
  onDaveInvalidateTransition(transitionId) {
    if (this.state.code === 3 /* SelectingProtocol */ || this.state.code === 4 /* Ready */)
      this.state.ws.sendPacket({
        op: import_v82.VoiceOpcodes.DaveMlsInvalidCommitWelcome,
        d: { transition_id: transitionId }
      });
  }
  /**
   * Propagates debug messages from the child WebSocket.
   *
   * @param message - The emitted debug message
   */
  onWsDebug(message) {
    this.debug?.(`[WS] ${message}`);
  }
  /**
   * Propagates debug messages from the child UDPSocket.
   *
   * @param message - The emitted debug message
   */
  onUdpDebug(message) {
    this.debug?.(`[UDP] ${message}`);
  }
  /**
   * Propagates debug messages from the child DAVESession.
   *
   * @param message - The emitted debug message
   */
  onDaveDebug(message) {
    this.debug?.(`[DAVE] ${message}`);
  }
  /**
   * Prepares an Opus packet for playback. This includes attaching metadata to it and encrypting it.
   * It will be stored within the instance, and can be played by dispatchAudio()
   *
   * @remarks
   * Calling this method while there is already a prepared audio packet that has not yet been dispatched
   * will overwrite the existing audio packet. This should be avoided.
   * @param opusPacket - The Opus packet to encrypt
   * @returns The audio packet that was prepared
   */
  prepareAudioPacket(opusPacket) {
    const state = this.state;
    if (state.code !== 4 /* Ready */) return;
    state.preparedPacket = this.createAudioPacket(
      opusPacket,
      state.connectionData,
      state.dave
    );
    return state.preparedPacket;
  }
  /**
   * Dispatches the audio packet previously prepared by prepareAudioPacket(opusPacket). The audio packet
   * is consumed and cannot be dispatched again.
   */
  dispatchAudio() {
    const state = this.state;
    if (state.code !== 4 /* Ready */) return false;
    if (state.preparedPacket !== void 0) {
      this.playAudioPacket(state.preparedPacket);
      state.preparedPacket = void 0;
      return true;
    }
    return false;
  }
  /**
   * Plays an audio packet, updating timing metadata used for playback.
   *
   * @param audioPacket - The audio packet to play
   */
  playAudioPacket(audioPacket) {
    const state = this.state;
    if (state.code !== 4 /* Ready */) return;
    const { connectionData } = state;
    connectionData.packetsPlayed++;
    connectionData.sequence++;
    connectionData.timestamp += TIMESTAMP_INC;
    if (connectionData.sequence >= 2 ** 16) connectionData.sequence = 0;
    if (connectionData.timestamp >= 2 ** 32) connectionData.timestamp = 0;
    this.setSpeaking(true);
    state.udp.send(audioPacket);
  }
  /**
   * Sends a packet to the voice gateway indicating that the client has start/stopped sending
   * audio.
   *
   * @param speaking - Whether or not the client should be shown as speaking
   */
  setSpeaking(speaking) {
    const state = this.state;
    if (state.code !== 4 /* Ready */) return;
    if (state.connectionData.speaking === speaking) return;
    state.connectionData.speaking = speaking;
    state.ws.sendPacket({
      op: import_v82.VoiceOpcodes.Speaking,
      d: {
        speaking: speaking ? 1 : 0,
        delay: 0,
        ssrc: state.connectionData.ssrc
      }
    });
  }
  /**
   * Creates a new audio packet from an Opus packet. This involves encrypting the packet,
   * then prepending a header that includes metadata.
   *
   * @param opusPacket - The Opus packet to prepare
   * @param connectionData - The current connection data of the instance
   * @param daveSession - The DAVE session to use for encryption
   */
  createAudioPacket(opusPacket, connectionData, daveSession) {
    const rtpHeader = import_node_buffer6.Buffer.alloc(12);
    rtpHeader[0] = 128;
    rtpHeader[1] = 120;
    const { sequence, timestamp, ssrc } = connectionData;
    rtpHeader.writeUIntBE(sequence, 2, 2);
    rtpHeader.writeUIntBE(timestamp, 4, 4);
    rtpHeader.writeUIntBE(ssrc, 8, 4);
    rtpHeader.copy(nonce, 0, 0, 12);
    return import_node_buffer6.Buffer.concat(
      [
        rtpHeader,
        ...this.encryptOpusPacket(
          opusPacket,
          connectionData,
          rtpHeader,
          daveSession
        )
      ]
    );
  }
  /**
   * Encrypts an Opus packet using the format agreed upon by the instance and Discord.
   *
   * @param opusPacket - The Opus packet to encrypt
   * @param connectionData - The current connection data of the instance
   * @param daveSession - The DAVE session to use for encryption
   */
  encryptOpusPacket(opusPacket, connectionData, additionalData, daveSession) {
    const { secretKey, encryptionMode } = connectionData;
    const packet = daveSession?.encrypt(opusPacket) ?? opusPacket;
    connectionData.nonce++;
    if (connectionData.nonce > MAX_NONCE_SIZE) connectionData.nonce = 0;
    connectionData.nonceBuffer.writeUInt32BE(connectionData.nonce, 0);
    const noncePadding = connectionData.nonceBuffer.subarray(0, 4);
    let encrypted;
    switch (encryptionMode) {
      case "aead_aes256_gcm_rtpsize": {
        const cipher = import_node_crypto.default.createCipheriv(
          "aes-256-gcm",
          secretKey,
          connectionData.nonceBuffer
        );
        cipher.setAAD(additionalData);
        encrypted = import_node_buffer6.Buffer.concat(
          [
            cipher.update(packet),
            cipher.final(),
            cipher.getAuthTag()
          ]
        );
        return [encrypted, noncePadding];
      }
      case "aead_xchacha20_poly1305_rtpsize": {
        encrypted = methods.crypto_aead_xchacha20poly1305_ietf_encrypt(
          packet,
          additionalData,
          connectionData.nonceBuffer,
          secretKey
        );
        return [encrypted, noncePadding];
      }
      default: {
        throw new RangeError(
          `Unsupported encryption method: ${encryptionMode}`
        );
      }
    }
  }
};
__name(_Networking, "Networking");
var Networking = _Networking;

// src/VoiceConnection.ts
var VoiceConnectionStatus = /* @__PURE__ */ ((VoiceConnectionStatus2) => {
  VoiceConnectionStatus2["Connecting"] = "connecting";
  VoiceConnectionStatus2["Destroyed"] = "destroyed";
  VoiceConnectionStatus2["Disconnected"] = "disconnected";
  VoiceConnectionStatus2["Ready"] = "ready";
  VoiceConnectionStatus2["Signalling"] = "signalling";
  return VoiceConnectionStatus2;
})(VoiceConnectionStatus || {});
var VoiceConnectionDisconnectReason = /* @__PURE__ */ ((VoiceConnectionDisconnectReason2) => {
  VoiceConnectionDisconnectReason2[VoiceConnectionDisconnectReason2["WebSocketClose"] = 0] = "WebSocketClose";
  VoiceConnectionDisconnectReason2[VoiceConnectionDisconnectReason2["AdapterUnavailable"] = 1] = "AdapterUnavailable";
  VoiceConnectionDisconnectReason2[VoiceConnectionDisconnectReason2["EndpointRemoved"] = 2] = "EndpointRemoved";
  VoiceConnectionDisconnectReason2[VoiceConnectionDisconnectReason2["Manual"] = 3] = "Manual";
  return VoiceConnectionDisconnectReason2;
})(VoiceConnectionDisconnectReason || {});
var _VoiceConnection = class _VoiceConnection extends import_node_events6.EventEmitter {
  /**
   * Creates a new voice connection.
   *
   * @param joinConfig - The data required to establish the voice connection
   * @param options - The options used to create this voice connection
   */
  constructor(joinConfig, options) {
    super();
    /**
     * The number of consecutive rejoin attempts. Initially 0, and increments for each rejoin.
     * When a connection is successfully established, it resets to 0.
     */
    __publicField(this, "rejoinAttempts");
    /**
     * The state of the voice connection.
     */
    __publicField(this, "_state");
    /**
     * A configuration storing all the data needed to reconnect to a Guild's voice server.
     *
     * @internal
     */
    __publicField(this, "joinConfig");
    /**
     * The two packets needed to successfully establish a voice connection. They are received
     * from the main Discord gateway after signalling to change the voice state.
     */
    __publicField(this, "packets");
    /**
     * The debug logger function, if debugging is enabled.
     */
    __publicField(this, "debug");
    /**
     * The options used to create this voice connection.
     */
    __publicField(this, "options");
    this.debug = options.debug ? (message) => this.emit("debug", message) : null;
    this.rejoinAttempts = 0;
    this.onNetworkingClose = this.onNetworkingClose.bind(this);
    this.onNetworkingStateChange = this.onNetworkingStateChange.bind(this);
    this.onNetworkingError = this.onNetworkingError.bind(this);
    this.onNetworkingDebug = this.onNetworkingDebug.bind(this);
    this.onNetworkingTransitioned = this.onNetworkingTransitioned.bind(this);
    const adapter = options.adapterCreator({
      onVoiceServerUpdate: /* @__PURE__ */ __name((data) => this.addServerPacket(data), "onVoiceServerUpdate"),
      onVoiceStateUpdate: /* @__PURE__ */ __name((data) => this.addStatePacket(data), "onVoiceStateUpdate"),
      destroy: /* @__PURE__ */ __name(() => this.destroy(false), "destroy")
    });
    this._state = { status: "signalling" /* Signalling */, adapter };
    this.packets = {
      server: void 0,
      state: void 0
    };
    this.joinConfig = joinConfig;
    this.options = options;
  }
  /**
   * The current state of the voice connection.
   *
   * @remarks
   * The setter will perform clean-up operations where necessary.
   */
  get state() {
    return this._state;
  }
  set state(newState) {
    const oldState = this._state;
    const oldNetworking = Reflect.get(oldState, "networking");
    const newNetworking = Reflect.get(newState, "networking");
    const oldSubscription = Reflect.get(oldState, "subscription");
    const newSubscription = Reflect.get(newState, "subscription");
    if (oldNetworking !== newNetworking) {
      if (oldNetworking) {
        oldNetworking.on("error", noop);
        oldNetworking.off("debug", this.onNetworkingDebug);
        oldNetworking.off("error", this.onNetworkingError);
        oldNetworking.off("close", this.onNetworkingClose);
        oldNetworking.off("stateChange", this.onNetworkingStateChange);
        oldNetworking.off("transitioned", this.onNetworkingTransitioned);
        oldNetworking.destroy();
      }
    }
    if (newState.status === "ready" /* Ready */) {
      this.rejoinAttempts = 0;
    }
    if (oldState.status !== "destroyed" /* Destroyed */ && newState.status === "destroyed" /* Destroyed */) {
      oldState.adapter.destroy();
    }
    this._state = newState;
    if (oldSubscription && oldSubscription !== newSubscription) {
      oldSubscription.unsubscribe();
    }
    this.emit("stateChange", oldState, newState);
    if (oldState.status !== newState.status) {
      this.emit(newState.status, oldState, newState);
    }
  }
  /**
   * Registers a `VOICE_SERVER_UPDATE` packet to the voice connection. This will cause it to reconnect using the
   * new data provided in the packet.
   *
   * @param packet - The received `VOICE_SERVER_UPDATE` packet
   */
  addServerPacket(packet) {
    this.packets.server = packet;
    if (packet.endpoint) {
      this.configureNetworking();
    } else if (this.state.status !== "destroyed" /* Destroyed */) {
      this.state = {
        ...this.state,
        status: "disconnected" /* Disconnected */,
        reason: 2 /* EndpointRemoved */
      };
    }
  }
  /**
   * Registers a `VOICE_STATE_UPDATE` packet to the voice connection. Most importantly, it stores the id of the
   * channel that the client is connected to.
   *
   * @param packet - The received `VOICE_STATE_UPDATE` packet
   */
  addStatePacket(packet) {
    this.packets.state = packet;
    if (packet.self_deaf !== void 0)
      this.joinConfig.selfDeaf = packet.self_deaf;
    if (packet.self_mute !== void 0)
      this.joinConfig.selfMute = packet.self_mute;
    if (packet.channel_id) this.joinConfig.channelId = packet.channel_id;
  }
  /**
   * Attempts to configure a networking instance for this voice connection using the received packets.
   * Both packets are required, and any existing networking instance will be destroyed.
   *
   * @remarks
   * This is called when the voice server of the connection changes, e.g. if the bot is moved into a
   * different channel in the same guild but has a different voice server. In this instance, the connection
   * needs to be re-established to the new voice server.
   *
   * The connection will transition to the Connecting state when this is called.
   */
  configureNetworking() {
    const { server, state } = this.packets;
    if (!server || !state || this.state.status === "destroyed" /* Destroyed */ || !server.endpoint)
      return;
    const networking = new Networking(
      {
        endpoint: server.endpoint,
        serverId: server.guild_id,
        token: server.token,
        sessionId: state.session_id,
        userId: state.user_id,
        channelId: state.channel_id
      },
      {
        debug: Boolean(this.debug),
        daveEncryption: this.options.daveEncryption ?? true,
        decryptionFailureTolerance: this.options.decryptionFailureTolerance
      }
    );
    networking.once("close", this.onNetworkingClose);
    networking.on("stateChange", this.onNetworkingStateChange);
    networking.on("error", this.onNetworkingError);
    networking.on("debug", this.onNetworkingDebug);
    networking.on("transitioned", this.onNetworkingTransitioned);
    this.state = {
      ...this.state,
      status: "connecting" /* Connecting */,
      networking
    };
  }
  /**
   * Called when the networking instance for this connection closes. If the close code is 4014 (do not reconnect),
   * the voice connection will transition to the Disconnected state which will store the close code. You can
   * decide whether or not to reconnect when this occurs by listening for the state change and calling reconnect().
   *
   * @remarks
   * If the close code was anything other than 4014, it is likely that the closing was not intended, and so the
   * VoiceConnection will signal to Discord that it would like to rejoin the channel. This automatically attempts
   * to re-establish the connection. This would be seen as a transition from the Ready state to the Signalling state.
   * @param code - The close code
   */
  onNetworkingClose(code) {
    if (this.state.status === "destroyed" /* Destroyed */) return;
    if (code === 4014) {
      this.state = {
        ...this.state,
        status: "disconnected" /* Disconnected */,
        reason: 0 /* WebSocketClose */,
        closeCode: code
      };
    } else {
      this.state = {
        ...this.state,
        status: "signalling" /* Signalling */
      };
      this.rejoinAttempts++;
      if (!this.state.adapter.sendPayload(
        createJoinVoiceChannelPayload(this.joinConfig)
      )) {
        this.state = {
          ...this.state,
          status: "disconnected" /* Disconnected */,
          reason: 1 /* AdapterUnavailable */
        };
      }
    }
  }
  /**
   * Called when the state of the networking instance changes. This is used to derive the state of the voice connection.
   *
   * @param oldState - The previous state
   * @param newState - The new state
   */
  onNetworkingStateChange(oldState, newState) {
    if (oldState.code === newState.code) return;
    if (this.state.status !== "connecting" /* Connecting */ && this.state.status !== "ready" /* Ready */)
      return;
    if (newState.code === 4 /* Ready */) {
      this.state = {
        ...this.state,
        status: "ready" /* Ready */
      };
    } else if (newState.code !== 6 /* Closed */) {
      this.state = {
        ...this.state,
        status: "connecting" /* Connecting */
      };
    }
  }
  /**
   * Propagates errors from the underlying network instance.
   *
   * @param error - The error to propagate
   */
  onNetworkingError(error) {
    this.emit("error", error);
  }
  /**
   * Propagates debug messages from the underlying network instance.
   *
   * @param message - The debug message to propagate
   */
  onNetworkingDebug(message) {
    this.debug?.(`[NW] ${message}`);
  }
  /**
   * Propagates transitions from the underlying network instance.
   *
   * @param transitionId - The transition id
   */
  onNetworkingTransitioned(transitionId) {
    this.emit("transitioned", transitionId);
  }
  /**
   * Prepares an audio packet for dispatch.
   *
   * @param buffer - The Opus packet to prepare
   */
  prepareAudioPacket(buffer) {
    const state = this.state;
    if (state.status !== "ready" /* Ready */) return;
    return state.networking.prepareAudioPacket(buffer);
  }
  /**
   * Dispatches the previously prepared audio packet (if any)
   */
  dispatchAudio() {
    const state = this.state;
    if (state.status !== "ready" /* Ready */) return;
    return state.networking.dispatchAudio();
  }
  /**
   * Prepares an audio packet and dispatches it immediately.
   *
   * @param buffer - The Opus packet to play
   */
  playOpusPacket(buffer) {
    const state = this.state;
    if (state.status !== "ready" /* Ready */) return;
    state.networking.prepareAudioPacket(buffer);
    return state.networking.dispatchAudio();
  }
  /**
   * Destroys the VoiceConnection, preventing it from connecting to voice again.
   * This method should be called when you no longer require the VoiceConnection to
   * prevent memory leaks.
   *
   * @param adapterAvailable - Whether the adapter can be used
   */
  destroy(adapterAvailable = true) {
    if (this.state.status === "destroyed" /* Destroyed */) {
      throw new Error(
        "Cannot destroy VoiceConnection - it has already been destroyed"
      );
    }
    if (getVoiceConnection(this.joinConfig.guildId, this.joinConfig.group) === this) {
      untrackVoiceConnection(this);
    }
    if (adapterAvailable) {
      this.state.adapter.sendPayload(
        createJoinVoiceChannelPayload({ ...this.joinConfig, channelId: null })
      );
    }
    this.state = {
      status: "destroyed" /* Destroyed */
    };
  }
  /**
   * Disconnects the VoiceConnection, allowing the possibility of rejoining later on.
   *
   * @returns `true` if the connection was successfully disconnected
   */
  disconnect() {
    if (this.state.status === "destroyed" /* Destroyed */ || this.state.status === "signalling" /* Signalling */) {
      return false;
    }
    this.joinConfig.channelId = null;
    if (!this.state.adapter.sendPayload(
      createJoinVoiceChannelPayload(this.joinConfig)
    )) {
      this.state = {
        adapter: this.state.adapter,
        subscription: this.state.subscription,
        status: "disconnected" /* Disconnected */,
        reason: 1 /* AdapterUnavailable */
      };
      return false;
    }
    this.state = {
      adapter: this.state.adapter,
      reason: 3 /* Manual */,
      status: "disconnected" /* Disconnected */
    };
    return true;
  }
  /**
   * Attempts to rejoin (better explanation soon:tm:)
   *
   * @remarks
   * Calling this method successfully will automatically increment the `rejoinAttempts` counter,
   * which you can use to inform whether or not you'd like to keep attempting to reconnect your
   * voice connection.
   *
   * A state transition from Disconnected to Signalling will be observed when this is called.
   */
  rejoin(joinConfig) {
    if (this.state.status === "destroyed" /* Destroyed */) {
      return false;
    }
    const notReady = this.state.status !== "ready" /* Ready */;
    if (notReady) this.rejoinAttempts++;
    Object.assign(this.joinConfig, joinConfig);
    if (this.state.adapter.sendPayload(
      createJoinVoiceChannelPayload(this.joinConfig)
    )) {
      if (notReady) {
        this.state = {
          ...this.state,
          status: "signalling" /* Signalling */
        };
      }
      return true;
    }
    this.state = {
      adapter: this.state.adapter,
      subscription: this.state.subscription,
      status: "disconnected" /* Disconnected */,
      reason: 1 /* AdapterUnavailable */
    };
    return false;
  }
  /**
   * Updates the speaking status of the voice connection. This is used when audio players are done playing audio,
   * and need to signal that the connection is no longer playing audio.
   *
   * @param enabled - Whether or not to show as speaking
   */
  setSpeaking(enabled) {
    if (this.state.status !== "ready" /* Ready */) return false;
    return this.state.networking.setSpeaking(enabled);
  }
  /**
   * Subscribes to an audio player, allowing the player to play audio on this voice connection.
   *
   * @param player - The audio player to subscribe to
   * @returns The created subscription
   */
  subscribe(player) {
    if (this.state.status === "destroyed" /* Destroyed */) return;
    const subscription = player["subscribe"](this);
    this.state = {
      ...this.state,
      subscription
    };
    return subscription;
  }
  /**
   * The latest ping (in milliseconds) for the WebSocket connection and audio playback for this voice
   * connection, if this data is available.
   *
   * @remarks
   * For this data to be available, the VoiceConnection must be in the Ready state, and its underlying
   * WebSocket connection and UDP socket must have had at least one ping-pong exchange.
   */
  get ping() {
    if (this.state.status === "ready" /* Ready */ && this.state.networking.state.code === 4 /* Ready */) {
      return {
        ws: this.state.networking.state.ws.ping,
        udp: this.state.networking.state.udp.ping
      };
    }
    return {
      ws: void 0,
      udp: void 0
    };
  }
  /**
   * The current voice privacy code of the encrypted session.
   *
   * @remarks
   * For this data to be available, the VoiceConnection must be in the Ready state,
   * and the connection would have to be end-to-end encrypted.
   */
  get voicePrivacyCode() {
    if (this.state.status === "ready" /* Ready */ && this.state.networking.state.code === 4 /* Ready */) {
      return this.state.networking.state.dave?.voicePrivacyCode ?? void 0;
    }
    return void 0;
  }
  /**
   * Gets the verification code for a user in the session.
   *
   * @throws Will throw if end-to-end encryption is not on or if the user id provided is not in the session.
   */
  async getVerificationCode(userId) {
    if (this.state.status === "ready" /* Ready */ && this.state.networking.state.code === 4 /* Ready */ && this.state.networking.state.dave) {
      return this.state.networking.state.dave.getVerificationCode(userId);
    }
    throw new Error("Session not available");
  }
  /**
   * Called when a subscription of this voice connection to an audio player is removed.
   *
   * @param subscription - The removed subscription
   */
  onSubscriptionRemoved(subscription) {
    if (this.state.status !== "destroyed" /* Destroyed */ && this.state.subscription === subscription) {
      this.state = {
        ...this.state,
        subscription: void 0
      };
    }
  }
};
__name(_VoiceConnection, "VoiceConnection");
var VoiceConnection = _VoiceConnection;
function createVoiceConnection(joinConfig, options) {
  const payload = createJoinVoiceChannelPayload(joinConfig);
  const existing = getVoiceConnection(joinConfig.guildId, joinConfig.group);
  if (existing && existing.state.status !== "destroyed" /* Destroyed */) {
    if (existing.state.status === "disconnected" /* Disconnected */) {
      existing.rejoin({
        channelId: joinConfig.channelId,
        selfDeaf: joinConfig.selfDeaf,
        selfMute: joinConfig.selfMute
      });
    } else if (!existing.state.adapter.sendPayload(payload)) {
      existing.state = {
        ...existing.state,
        status: "disconnected" /* Disconnected */,
        reason: 1 /* AdapterUnavailable */
      };
    }
    return existing;
  }
  const voiceConnection = new VoiceConnection(joinConfig, options);
  trackVoiceConnection(voiceConnection);
  if (voiceConnection.state.status !== "destroyed" /* Destroyed */ && !voiceConnection.state.adapter.sendPayload(payload)) {
    voiceConnection.state = {
      ...voiceConnection.state,
      status: "disconnected" /* Disconnected */,
      reason: 1 /* AdapterUnavailable */
    };
  }
  return voiceConnection;
}
__name(createVoiceConnection, "createVoiceConnection");

// src/joinVoiceChannel.ts
function joinVoiceChannel(options) {
  const joinConfig = {
    selfDeaf: true,
    selfMute: false,
    group: "default",
    ...options
  };
  return createVoiceConnection(joinConfig, {
    adapterCreator: options.adapterCreator,
    debug: options.debug,
    daveEncryption: options.daveEncryption,
    decryptionFailureTolerance: options.decryptionFailureTolerance
  });
}
__name(joinVoiceChannel, "joinVoiceChannel");

// src/audio/AudioResource.ts
var import_node_stream = require("stream");

// src/audio/TransformerGraph.ts
var import_opus = require("@discord-player/opus");
var import_ffmpeg = require("@discord-player/ffmpeg");
var import_equalizer = require("@discord-player/equalizer");
var FFMPEG_PCM_ARGUMENTS = (0, import_ffmpeg.createFFmpegArgs)({
  analyzeduration: "0",
  loglevel: "0",
  f: "s16le",
  ar: "48000",
  ac: "2"
});
var FFMPEG_OPUS_ARGUMENTS = (0, import_ffmpeg.createFFmpegArgs)({
  analyzeduration: "0",
  loglevel: "0",
  acodec: "libopus",
  f: "opus",
  ar: "48000",
  ac: "2"
});
var StreamType = /* @__PURE__ */ ((StreamType2) => {
  StreamType2["Arbitrary"] = "arbitrary";
  StreamType2["OggOpus"] = "ogg/opus";
  StreamType2["Opus"] = "opus";
  StreamType2["Raw"] = "raw";
  StreamType2["WebmOpus"] = "webm/opus";
  return StreamType2;
})(StreamType || {});
var _Node = class _Node {
  constructor(type) {
    /**
     * The outbound edges from this node.
     */
    __publicField(this, "edges", []);
    /**
     * The type of stream for this node.
     */
    __publicField(this, "type");
    this.type = type;
  }
  /**
   * Creates an outbound edge from this node.
   *
   * @param edge - The edge to create
   */
  addEdge(edge) {
    this.edges.push({ ...edge, from: this });
  }
};
__name(_Node, "Node");
var Node = _Node;
var NODES = null;
function canEnableFFmpegOptimizations() {
  return import_ffmpeg.FFmpeg.resolveSafe()?.result.includes("--enable-libopus") === true;
}
__name(canEnableFFmpegOptimizations, "canEnableFFmpegOptimizations");
function getNode(type) {
  const node = (NODES ?? (NODES = initializeNodes())).get(type);
  if (!node) throw new Error(`Node type '${type}' does not exist!`);
  return node;
}
__name(getNode, "getNode");
function initializeNodes() {
  const nodes = /* @__PURE__ */ new Map();
  for (const streamType of Object.values(StreamType)) {
    nodes.set(streamType, new Node(streamType));
  }
  nodes.get("raw" /* Raw */).addEdge({
    type: "opus encoder" /* OpusEncoder */,
    to: nodes.get("opus" /* Opus */),
    cost: 1.5,
    transformer: /* @__PURE__ */ __name(() => new import_opus.OpusEncoder({ rate: 48e3, channels: 2, frameSize: 960 }), "transformer")
  });
  nodes.get("opus" /* Opus */).addEdge({
    type: "opus decoder" /* OpusDecoder */,
    to: nodes.get("raw" /* Raw */),
    cost: 1.5,
    transformer: /* @__PURE__ */ __name(() => new import_opus.OpusDecoder({ rate: 48e3, channels: 2, frameSize: 960 }), "transformer")
  });
  nodes.get("ogg/opus" /* OggOpus */).addEdge({
    type: "ogg/opus demuxer" /* OggOpusDemuxer */,
    to: nodes.get("opus" /* Opus */),
    cost: 1,
    transformer: /* @__PURE__ */ __name(() => new import_opus.OggDemuxer(), "transformer")
  });
  nodes.get("webm/opus" /* WebmOpus */).addEdge({
    type: "webm/opus demuxer" /* WebmOpusDemuxer */,
    to: nodes.get("opus" /* Opus */),
    cost: 1,
    transformer: /* @__PURE__ */ __name(() => new import_opus.WebmDemuxer(), "transformer")
  });
  const FFMPEG_PCM_EDGE = {
    type: "ffmpeg pcm" /* FFmpegPCM */,
    to: nodes.get("raw" /* Raw */),
    cost: 2,
    transformer: /* @__PURE__ */ __name((input) => new import_ffmpeg.FFmpeg({
      args: [
        "-i",
        typeof input === "string" ? input : "-",
        ...FFMPEG_PCM_ARGUMENTS
      ]
    }), "transformer")
  };
  nodes.get("arbitrary" /* Arbitrary */).addEdge(FFMPEG_PCM_EDGE);
  nodes.get("ogg/opus" /* OggOpus */).addEdge(FFMPEG_PCM_EDGE);
  nodes.get("webm/opus" /* WebmOpus */).addEdge(FFMPEG_PCM_EDGE);
  nodes.get("raw" /* Raw */).addEdge({
    type: "volume transformer" /* InlineVolume */,
    to: nodes.get("raw" /* Raw */),
    cost: 0.5,
    transformer: /* @__PURE__ */ __name(() => new import_equalizer.VolumeTransformer({ type: "s16le" }), "transformer")
  });
  if (canEnableFFmpegOptimizations()) {
    const FFMPEG_OGG_EDGE = {
      type: "ffmpeg ogg" /* FFmpegOgg */,
      to: nodes.get("ogg/opus" /* OggOpus */),
      cost: 2,
      transformer: /* @__PURE__ */ __name((input) => new import_ffmpeg.FFmpeg({
        args: [
          "-i",
          typeof input === "string" ? input : "-",
          ...FFMPEG_OPUS_ARGUMENTS
        ]
      }), "transformer")
    };
    nodes.get("arbitrary" /* Arbitrary */).addEdge(FFMPEG_OGG_EDGE);
    nodes.get("ogg/opus" /* OggOpus */).addEdge(FFMPEG_OGG_EDGE);
    nodes.get("webm/opus" /* WebmOpus */).addEdge(FFMPEG_OGG_EDGE);
  }
  return nodes;
}
__name(initializeNodes, "initializeNodes");
function findPath(from, constraints, goal = getNode("opus" /* Opus */), path = [], depth = 5) {
  if (from === goal && constraints(path)) {
    return { cost: 0 };
  } else if (depth === 0) {
    return { cost: Number.POSITIVE_INFINITY };
  }
  let currentBest;
  for (const edge of from.edges) {
    if (currentBest && edge.cost > currentBest.cost) continue;
    const next = findPath(
      edge.to,
      constraints,
      goal,
      [...path, edge],
      depth - 1
    );
    const cost = edge.cost + next.cost;
    if (!currentBest || cost < currentBest.cost) {
      currentBest = { cost, edge, next };
    }
  }
  return currentBest ?? { cost: Number.POSITIVE_INFINITY };
}
__name(findPath, "findPath");
function constructPipeline(step) {
  const edges = [];
  let current = step;
  while (current?.edge) {
    edges.push(current.edge);
    current = current.next;
  }
  return edges;
}
__name(constructPipeline, "constructPipeline");
function findPipeline(from, constraint) {
  return constructPipeline(findPath(getNode(from), constraint));
}
__name(findPipeline, "findPipeline");

// src/audio/AudioResource.ts
var import_opus2 = require("@discord-player/opus");
var import_equalizer2 = require("@discord-player/equalizer");
var _AudioResource = class _AudioResource {
  constructor(edges, streams, metadata, silencePaddingFrames) {
    /**
     * An object-mode Readable stream that emits Opus packets. This is what is played by audio players.
     */
    __publicField(this, "playStream");
    /**
     * The pipeline used to convert the input stream into a playable format. For example, this may
     * contain an FFmpeg component for arbitrary inputs, and it may contain a VolumeTransformer component
     * for resources with inline volume transformation enabled.
     */
    __publicField(this, "edges");
    /**
     * Optional metadata that can be used to identify the resource.
     */
    __publicField(this, "metadata");
    /**
     * If the resource was created with inline volume transformation enabled, then this will be a
     * `@discord-player/equalizer` VolumeTransformer. You can use this to alter the volume of the stream.
     */
    __publicField(this, "volume");
    /**
     * If using an Opus encoder to create this audio resource, then this will be a`@discord-player/opus` opus.Encoder.
     * You can use this to control settings such as bitrate, FEC, PLP.
     */
    __publicField(this, "encoder");
    /**
     * The audio player that the resource is subscribed to, if any.
     */
    __publicField(this, "audioPlayer");
    /**
     * The playback duration of this audio resource, given in milliseconds.
     */
    __publicField(this, "playbackDuration", 0);
    /**
     * Whether or not the stream for this resource has started (data has become readable)
     */
    __publicField(this, "started", false);
    /**
     * The number of silence frames to append to the end of the resource's audio stream, to prevent interpolation glitches.
     */
    __publicField(this, "silencePaddingFrames");
    /**
     * The number of remaining silence frames to play. If -1, the frames have not yet started playing.
     */
    __publicField(this, "silenceRemaining", -1);
    this.edges = edges;
    this.playStream = streams.length > 1 ? (0, import_node_stream.pipeline)(streams, noop) : streams[0];
    this.metadata = metadata;
    this.silencePaddingFrames = silencePaddingFrames;
    for (const stream of streams) {
      if (stream instanceof import_equalizer2.VolumeTransformer) {
        this.volume = stream;
      } else if (stream instanceof import_opus2.OpusEncoder) {
        this.encoder = stream;
      }
    }
    this.playStream.once("readable", () => this.started = true);
  }
  /**
   * Whether this resource is readable. If the underlying resource is no longer readable, this will still return true
   * while there are silence padding frames left to play.
   */
  get readable() {
    if (this.silenceRemaining === 0) return false;
    const real = this.playStream.readable;
    if (!real) {
      if (this.silenceRemaining === -1)
        this.silenceRemaining = this.silencePaddingFrames;
      return this.silenceRemaining !== 0;
    }
    return real;
  }
  /**
   * Whether this resource has ended or not.
   */
  get ended() {
    return this.playStream.readableEnded || this.playStream.destroyed || this.silenceRemaining === 0;
  }
  /**
   * Attempts to read an Opus packet from the audio resource. If a packet is available, the playbackDuration
   * is incremented.
   *
   * @remarks
   * It is advisable to check that the playStream is readable before calling this method. While no runtime
   * errors will be thrown, you should check that the resource is still available before attempting to
   * read from it.
   * @internal
   */
  read() {
    if (this.silenceRemaining === 0) {
      return null;
    } else if (this.silenceRemaining > 0) {
      this.silenceRemaining--;
      return SILENCE_FRAME;
    }
    const packet = this.playStream.read();
    if (packet) {
      this.playbackDuration += 20;
    }
    return packet;
  }
};
__name(_AudioResource, "AudioResource");
var AudioResource = _AudioResource;
var VOLUME_CONSTRAINT = /* @__PURE__ */ __name((path) => path.some((edge) => edge.type === "volume transformer" /* InlineVolume */), "VOLUME_CONSTRAINT");
var NO_CONSTRAINT = /* @__PURE__ */ __name(() => true, "NO_CONSTRAINT");
function inferStreamType(stream) {
  if (stream instanceof import_opus2.OpusEncoder) {
    return { streamType: "opus" /* Opus */, hasVolume: false };
  } else if (stream instanceof import_opus2.OpusDecoder) {
    return { streamType: "raw" /* Raw */, hasVolume: false };
  } else if (stream instanceof import_equalizer2.VolumeTransformer) {
    return { streamType: "raw" /* Raw */, hasVolume: true };
  } else if (stream instanceof import_opus2.OggDemuxer) {
    return { streamType: "opus" /* Opus */, hasVolume: false };
  } else if (stream instanceof import_opus2.WebmDemuxer) {
    return { streamType: "opus" /* Opus */, hasVolume: false };
  }
  return { streamType: "arbitrary" /* Arbitrary */, hasVolume: false };
}
__name(inferStreamType, "inferStreamType");
function createAudioResource(input, options = {}) {
  let inputType = options.inputType;
  let needsInlineVolume = Boolean(options.inlineVolume);
  if (typeof input === "string") {
    inputType = "arbitrary" /* Arbitrary */;
  } else if (inputType === void 0) {
    const analysis = inferStreamType(input);
    inputType = analysis.streamType;
    needsInlineVolume = needsInlineVolume && !analysis.hasVolume;
  }
  const transformerPipeline = findPipeline(
    inputType,
    needsInlineVolume ? VOLUME_CONSTRAINT : NO_CONSTRAINT
  );
  if (transformerPipeline.length === 0) {
    if (typeof input === "string")
      throw new Error(
        `Invalid pipeline constructed for string resource '${input}'`
      );
    return new AudioResource(
      [],
      [input],
      options.metadata ?? null,
      options.silencePaddingFrames ?? 5
    );
  }
  const streams = transformerPipeline.map((edge) => edge.transformer(input));
  if (typeof input !== "string") streams.unshift(input);
  return new AudioResource(
    transformerPipeline,
    streams,
    options.metadata ?? null,
    options.silencePaddingFrames ?? 5
  );
}
__name(createAudioResource, "createAudioResource");

// src/util/entersState.ts
var import_node_events7 = require("events");

// src/util/abortAfter.ts
function abortAfter(delay) {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), delay);
  ac.signal.addEventListener("abort", () => clearTimeout(timeout));
  return [ac, ac.signal];
}
__name(abortAfter, "abortAfter");

// src/util/entersState.ts
async function entersState(target, status, timeoutOrSignal) {
  if (target.state.status !== status) {
    const [ac, signal] = typeof timeoutOrSignal === "number" ? abortAfter(timeoutOrSignal) : [void 0, timeoutOrSignal];
    try {
      await (0, import_node_events7.once)(target, status, { signal });
    } finally {
      ac?.abort();
    }
  }
  return target;
}
__name(entersState, "entersState");

// src/version.ts
var version = (
  /* @__MACRO__ getVersion */
  "7.2.0"
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AudioPlayer,
  AudioPlayerError,
  AudioPlayerStatus,
  AudioResource,
  NoSubscriberBehavior,
  PlayerSubscription,
  StreamType,
  VoiceConnection,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getGroups,
  getVoiceConnection,
  getVoiceConnections,
  joinVoiceChannel,
  version
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9Wb2ljZUNvbm5lY3Rpb24udHMiLCAiLi4vc3JjL0RhdGFTdG9yZS50cyIsICIuLi9zcmMvbmV0d29ya2luZy9OZXR3b3JraW5nLnRzIiwgIi4uL3NyYy91dGlsL1NlY3JldGJveC50cyIsICIuLi9zcmMvdXRpbC91dGlsLnRzIiwgIi4uL3NyYy9uZXR3b3JraW5nL0RBVkVTZXNzaW9uLnRzIiwgIi4uL3NyYy9hdWRpby9BdWRpb1BsYXllci50cyIsICIuLi9zcmMvYXVkaW8vQXVkaW9QbGF5ZXJFcnJvci50cyIsICIuLi9zcmMvYXVkaW8vUGxheWVyU3Vic2NyaXB0aW9uLnRzIiwgIi4uL3NyYy9uZXR3b3JraW5nL1ZvaWNlVURQU29ja2V0LnRzIiwgIi4uL3NyYy9uZXR3b3JraW5nL1ZvaWNlV2ViU29ja2V0LnRzIiwgIi4uL3NyYy9qb2luVm9pY2VDaGFubmVsLnRzIiwgIi4uL3NyYy9hdWRpby9BdWRpb1Jlc291cmNlLnRzIiwgIi4uL3NyYy9hdWRpby9UcmFuc2Zvcm1lckdyYXBoLnRzIiwgIi4uL3NyYy91dGlsL2VudGVyc1N0YXRlLnRzIiwgIi4uL3NyYy91dGlsL2Fib3J0QWZ0ZXIudHMiLCAiLi4vc3JjL3ZlcnNpb24udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG5leHBvcnQgKiBmcm9tICcuL2pvaW5Wb2ljZUNoYW5uZWwnO1xuZXhwb3J0ICogZnJvbSAnLi9hdWRpby9pbmRleCc7XG5leHBvcnQgKiBmcm9tICcuL3V0aWwvaW5kZXgnO1xuXG5leHBvcnQge1xuICBWb2ljZUNvbm5lY3Rpb24sXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uU3RhdGUsXG4gIFZvaWNlQ29ubmVjdGlvblN0YXR1cyxcbiAgdHlwZSBWb2ljZUNvbm5lY3Rpb25Db25uZWN0aW5nU3RhdGUsXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uRGVzdHJveWVkU3RhdGUsXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdGVkU3RhdGUsXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdGVkQmFzZVN0YXRlLFxuICB0eXBlIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZE90aGVyU3RhdGUsXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdGVkV2ViU29ja2V0U3RhdGUsXG4gIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24sXG4gIHR5cGUgVm9pY2VDb25uZWN0aW9uUmVhZHlTdGF0ZSxcbiAgdHlwZSBWb2ljZUNvbm5lY3Rpb25TaWduYWxsaW5nU3RhdGUgfSBmcm9tXG4nLi9Wb2ljZUNvbm5lY3Rpb24nO1xuXG5leHBvcnQge1xuICB0eXBlIEpvaW5Db25maWcsXG4gIGdldFZvaWNlQ29ubmVjdGlvbixcbiAgZ2V0Vm9pY2VDb25uZWN0aW9ucyxcbiAgZ2V0R3JvdXBzIH0gZnJvbVxuJy4vRGF0YVN0b3JlJztcblxuZXhwb3J0IHsgdmVyc2lvbiB9IGZyb20gJy4vdmVyc2lvbic7IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2QsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtZGVjbGFyYXRpb24tbWVyZ2luZyAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kICovXG5pbXBvcnQgdHlwZSB7IEJ1ZmZlciB9IGZyb20gJ25vZGU6YnVmZmVyJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ25vZGU6ZXZlbnRzJztcbmltcG9ydCB0eXBlIHtcbiAgR2F0ZXdheVZvaWNlU2VydmVyVXBkYXRlRGlzcGF0Y2hEYXRhLFxuICBHYXRld2F5Vm9pY2VTdGF0ZVVwZGF0ZURpc3BhdGNoRGF0YSB9IGZyb21cbidkaXNjb3JkLWFwaS10eXBlcy92MTAnO1xuaW1wb3J0IHR5cGUgeyBKb2luQ29uZmlnIH0gZnJvbSAnLi9EYXRhU3RvcmUnO1xuaW1wb3J0IHtcbiAgZ2V0Vm9pY2VDb25uZWN0aW9uLFxuICBjcmVhdGVKb2luVm9pY2VDaGFubmVsUGF5bG9hZCxcbiAgdHJhY2tWb2ljZUNvbm5lY3Rpb24sXG4gIHVudHJhY2tWb2ljZUNvbm5lY3Rpb24gfSBmcm9tXG4nLi9EYXRhU3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBBdWRpb1BsYXllciB9IGZyb20gJy4vYXVkaW8vQXVkaW9QbGF5ZXInO1xuaW1wb3J0IHR5cGUgeyBQbGF5ZXJTdWJzY3JpcHRpb24gfSBmcm9tICcuL2F1ZGlvL1BsYXllclN1YnNjcmlwdGlvbic7XG5pbXBvcnQge1xuICBOZXR3b3JraW5nLFxuICBOZXR3b3JraW5nU3RhdHVzQ29kZSxcbiAgdHlwZSBOZXR3b3JraW5nU3RhdGUgfSBmcm9tXG4nLi9uZXR3b3JraW5nL05ldHdvcmtpbmcnO1xuaW1wb3J0IHR5cGUgeyBEaXNjb3JkR2F0ZXdheUFkYXB0ZXJJbXBsZW1lbnRlck1ldGhvZHMgfSBmcm9tICcuL3V0aWwvYWRhcHRlcic7XG5pbXBvcnQgeyBub29wIH0gZnJvbSAnLi91dGlsL3V0aWwnO1xuaW1wb3J0IHR5cGUgeyBDcmVhdGVWb2ljZUNvbm5lY3Rpb25PcHRpb25zIH0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgeyB1bnNhZmUgfSBmcm9tICcuL2NvbW1vbi90eXBlcyc7XG5cbi8qKlxuICogVGhlIHZhcmlvdXMgc3RhdHVzIGNvZGVzIGEgdm9pY2UgY29ubmVjdGlvbiBjYW4gaG9sZCBhdCBhbnkgb25lIHRpbWUuXG4gKi9cbmV4cG9ydCBlbnVtIFZvaWNlQ29ubmVjdGlvblN0YXR1cyB7XG4gIC8qKlxuICAgKiBUaGUgYFZPSUNFX1NFUlZFUl9VUERBVEVgIGFuZCBgVk9JQ0VfU1RBVEVfVVBEQVRFYCBwYWNrZXRzIGhhdmUgYmVlbiByZWNlaXZlZCwgbm93IGF0dGVtcHRpbmcgdG8gZXN0YWJsaXNoIGEgdm9pY2UgY29ubmVjdGlvbi5cbiAgICovXG4gIENvbm5lY3RpbmcgPSAnY29ubmVjdGluZycsXG5cbiAgLyoqXG4gICAqIFRoZSB2b2ljZSBjb25uZWN0aW9uIGhhcyBiZWVuIGRlc3Ryb3llZCBhbmQgdW50cmFja2VkLCBpdCBjYW5ub3QgYmUgcmV1c2VkLlxuICAgKi9cbiAgRGVzdHJveWVkID0gJ2Rlc3Ryb3llZCcsXG5cbiAgLyoqXG4gICAqIFRoZSB2b2ljZSBjb25uZWN0aW9uIGhhcyBlaXRoZXIgYmVlbiBzZXZlcmVkIG9yIG5vdCBlc3RhYmxpc2hlZC5cbiAgICovXG4gIERpc2Nvbm5lY3RlZCA9ICdkaXNjb25uZWN0ZWQnLFxuXG4gIC8qKlxuICAgKiBBIHZvaWNlIGNvbm5lY3Rpb24gaGFzIGJlZW4gZXN0YWJsaXNoZWQsIGFuZCBpcyByZWFkeSB0byBiZSB1c2VkLlxuICAgKi9cbiAgUmVhZHkgPSAncmVhZHknLFxuXG4gIC8qKlxuICAgKiBTZW5kaW5nIGEgcGFja2V0IHRvIHRoZSBtYWluIERpc2NvcmQgZ2F0ZXdheSB0byBpbmRpY2F0ZSB3ZSB3YW50IHRvIGNoYW5nZSBvdXIgdm9pY2Ugc3RhdGUuXG4gICAqL1xuICBTaWduYWxsaW5nID0gJ3NpZ25hbGxpbmcnLFxufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgVm9pY2VDb25uZWN0aW9uIHdpbGwgYmUgaW4gd2hlbiBpdCBpcyB3YWl0aW5nIHRvIHJlY2VpdmUgYSBWT0lDRV9TRVJWRVJfVVBEQVRFIGFuZFxuICogVk9JQ0VfU1RBVEVfVVBEQVRFIHBhY2tldCBmcm9tIERpc2NvcmQsIHByb3ZpZGVkIGJ5IHRoZSBhZGFwdGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQ29ubmVjdGlvblNpZ25hbGxpbmdTdGF0ZSB7XG4gIGFkYXB0ZXI6IERpc2NvcmRHYXRld2F5QWRhcHRlckltcGxlbWVudGVyTWV0aG9kcztcbiAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuU2lnbmFsbGluZztcbiAgc3Vic2NyaXB0aW9uPzogUGxheWVyU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIFRoZSByZWFzb25zIGEgdm9pY2UgY29ubmVjdGlvbiBjYW4gYmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZS5cbiAqL1xuZXhwb3J0IGVudW0gVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdFJlYXNvbiB7XG4gIC8qKlxuICAgKiBXaGVuIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBoYXMgYmVlbiBjbG9zZWQuXG4gICAqL1xuICBXZWJTb2NrZXRDbG9zZSxcblxuICAvKipcbiAgICogV2hlbiB0aGUgYWRhcHRlciB3YXMgdW5hYmxlIHRvIHNlbmQgYSBtZXNzYWdlIHJlcXVlc3RlZCBieSB0aGUgVm9pY2VDb25uZWN0aW9uLlxuICAgKi9cbiAgQWRhcHRlclVuYXZhaWxhYmxlLFxuXG4gIC8qKlxuICAgKiBXaGVuIGEgVk9JQ0VfU0VSVkVSX1VQREFURSBwYWNrZXQgaXMgcmVjZWl2ZWQgd2l0aCBhIG51bGwgZW5kcG9pbnQsIGNhdXNpbmcgdGhlIGNvbm5lY3Rpb24gdG8gYmUgc2V2ZXJlZC5cbiAgICovXG4gIEVuZHBvaW50UmVtb3ZlZCxcblxuICAvKipcbiAgICogV2hlbiBhIG1hbnVhbCBkaXNjb25uZWN0IHdhcyByZXF1ZXN0ZWQuXG4gICAqL1xuICBNYW51YWwsXG59XG5cbi8qKlxuICogVGhlIHN0YXRlIHRoYXQgYSBWb2ljZUNvbm5lY3Rpb24gd2lsbCBiZSBpbiB3aGVuIGl0IGlzIG5vdCBjb25uZWN0ZWQgdG8gYSBEaXNjb3JkIHZvaWNlIHNlcnZlciBub3IgaXNcbiAqIGl0IGF0dGVtcHRpbmcgdG8gY29ubmVjdC4gWW91IGNhbiBtYW51YWxseSBhdHRlbXB0IHRvIHJlY29ubmVjdCB1c2luZyBWb2ljZUNvbm5lY3Rpb24jcmVjb25uZWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZEJhc2VTdGF0ZSB7XG4gIGFkYXB0ZXI6IERpc2NvcmRHYXRld2F5QWRhcHRlckltcGxlbWVudGVyTWV0aG9kcztcbiAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkO1xuICBzdWJzY3JpcHRpb24/OiBQbGF5ZXJTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogVGhlIHN0YXRlIHRoYXQgYSBWb2ljZUNvbm5lY3Rpb24gd2lsbCBiZSBpbiB3aGVuIGl0IGlzIG5vdCBjb25uZWN0ZWQgdG8gYSBEaXNjb3JkIHZvaWNlIHNlcnZlciBub3IgaXNcbiAqIGl0IGF0dGVtcHRpbmcgdG8gY29ubmVjdC4gWW91IGNhbiBtYW51YWxseSBhdHRlbXB0IHRvIHJlY29ubmVjdCB1c2luZyBWb2ljZUNvbm5lY3Rpb24jcmVjb25uZWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZE90aGVyU3RhdGUgZXh0ZW5kc1xuICBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0ZWRCYXNlU3RhdGUge1xuICByZWFzb246IEV4Y2x1ZGU8XG4gICAgVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdFJlYXNvbixcbiAgICBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0UmVhc29uLldlYlNvY2tldENsb3NlPjtcblxufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgVm9pY2VDb25uZWN0aW9uIHdpbGwgYmUgaW4gd2hlbiBpdHMgV2ViU29ja2V0IGNvbm5lY3Rpb24gd2FzIGNsb3NlZC5cbiAqIFlvdSBjYW4gbWFudWFsbHkgYXR0ZW1wdCB0byByZWNvbm5lY3QgdXNpbmcgVm9pY2VDb25uZWN0aW9uI3JlY29ubmVjdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0ZWRXZWJTb2NrZXRTdGF0ZSBleHRlbmRzXG4gIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZEJhc2VTdGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgY2xvc2UgY29kZSBvZiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24gdG8gdGhlIERpc2NvcmQgdm9pY2Ugc2VydmVyLlxuICAgKi9cbiAgY2xvc2VDb2RlOiBudW1iZXI7XG5cbiAgcmVhc29uOiBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0UmVhc29uLldlYlNvY2tldENsb3NlO1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZXMgdGhhdCBhIFZvaWNlQ29ubmVjdGlvbiBjYW4gYmUgaW4gd2hlbiBpdCBpcyBub3QgY29ubmVjdGVkIHRvIGEgRGlzY29yZCB2b2ljZSBzZXJ2ZXIgbm9yIGlzXG4gKiBpdCBhdHRlbXB0aW5nIHRvIGNvbm5lY3QuIFlvdSBjYW4gbWFudWFsbHkgYXR0ZW1wdCB0byBjb25uZWN0IHVzaW5nIFZvaWNlQ29ubmVjdGlvbiNyZWNvbm5lY3QuXG4gKi9cbmV4cG9ydCB0eXBlIFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZFN0YXRlID1cblZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RlZE90aGVyU3RhdGUgfFxuVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdGVkV2ViU29ja2V0U3RhdGU7XG5cbi8qKlxuICogVGhlIHN0YXRlIHRoYXQgYSBWb2ljZUNvbm5lY3Rpb24gd2lsbCBiZSBpbiB3aGVuIGl0IGlzIGVzdGFibGlzaGluZyBhIGNvbm5lY3Rpb24gdG8gYSBEaXNjb3JkXG4gKiB2b2ljZSBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVm9pY2VDb25uZWN0aW9uQ29ubmVjdGluZ1N0YXRlIHtcbiAgYWRhcHRlcjogRGlzY29yZEdhdGV3YXlBZGFwdGVySW1wbGVtZW50ZXJNZXRob2RzO1xuICBuZXR3b3JraW5nOiBOZXR3b3JraW5nO1xuICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5Db25uZWN0aW5nO1xuICBzdWJzY3JpcHRpb24/OiBQbGF5ZXJTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogVGhlIHN0YXRlIHRoYXQgYSBWb2ljZUNvbm5lY3Rpb24gd2lsbCBiZSBpbiB3aGVuIGl0IGhhcyBhbiBhY3RpdmUgY29ubmVjdGlvbiB0byBhIERpc2NvcmRcbiAqIHZvaWNlIHNlcnZlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWb2ljZUNvbm5lY3Rpb25SZWFkeVN0YXRlIHtcbiAgYWRhcHRlcjogRGlzY29yZEdhdGV3YXlBZGFwdGVySW1wbGVtZW50ZXJNZXRob2RzO1xuICBuZXR3b3JraW5nOiBOZXR3b3JraW5nO1xuICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeTtcbiAgc3Vic2NyaXB0aW9uPzogUGxheWVyU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgVm9pY2VDb25uZWN0aW9uIHdpbGwgYmUgaW4gd2hlbiBpdCBoYXMgYmVlbiBwZXJtYW5lbnRseSBiZWVuIGRlc3Ryb3llZCBieSB0aGVcbiAqIHVzZXIgYW5kIHVudHJhY2tlZCBieSB0aGUgbGlicmFyeS4gSXQgY2Fubm90IGJlIHJlY29ubmVjdGVkLCBpbnN0ZWFkLCBhIG5ldyBWb2ljZUNvbm5lY3Rpb25cbiAqIG5lZWRzIHRvIGJlIGVzdGFibGlzaGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQ29ubmVjdGlvbkRlc3Ryb3llZFN0YXRlIHtcbiAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGVzdHJveWVkO1xufVxuXG4vKipcbiAqIFRoZSB2YXJpb3VzIHN0YXRlcyB0aGF0IGEgdm9pY2UgY29ubmVjdGlvbiBjYW4gYmUgaW4uXG4gKi9cbmV4cG9ydCB0eXBlIFZvaWNlQ29ubmVjdGlvblN0YXRlID1cblZvaWNlQ29ubmVjdGlvbkNvbm5lY3RpbmdTdGF0ZSB8XG5Wb2ljZUNvbm5lY3Rpb25EZXN0cm95ZWRTdGF0ZSB8XG5Wb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0ZWRTdGF0ZSB8XG5Wb2ljZUNvbm5lY3Rpb25SZWFkeVN0YXRlIHxcblZvaWNlQ29ubmVjdGlvblNpZ25hbGxpbmdTdGF0ZTtcblxuZXhwb3J0IGludGVyZmFjZSBWb2ljZUNvbm5lY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAvKipcbiAgICogRW1pdHRlZCB3aGVuIHRoZXJlIGlzIGFuIGVycm9yIGVtaXR0ZWQgZnJvbSB0aGUgdm9pY2UgY29ubmVjdGlvblxuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb24oZXZlbnQ6ICdlcnJvcicsIGxpc3RlbmVyOiAoZXJyb3I6IEVycm9yKSA9PiB2b2lkKTogdGhpcztcbiAgLyoqXG4gICAqIEVtaXR0ZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSB2b2ljZSBjb25uZWN0aW9uXG4gICAqXG4gICAqIEBldmVudFByb3BlcnR5XG4gICAqL1xuICBvbihldmVudDogJ2RlYnVnJywgbGlzdGVuZXI6IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzO1xuICAvKipcbiAgICogRW1pdHRlZCB3aGVuIHRoZSBzdGF0ZSBvZiB0aGUgdm9pY2UgY29ubmVjdGlvbiBjaGFuZ2VzXG4gICAqXG4gICAqIEBldmVudFByb3BlcnR5XG4gICAqL1xuICBvbihcbiAgZXZlbnQ6ICdzdGF0ZUNoYW5nZScsXG4gIGxpc3RlbmVyOiAoXG4gIG9sZFN0YXRlOiBWb2ljZUNvbm5lY3Rpb25TdGF0ZSxcbiAgbmV3U3RhdGU6IFZvaWNlQ29ubmVjdGlvblN0YXRlKVxuICA9PiB2b2lkKVxuICA6IHRoaXM7XG4gIC8qKlxuICAgKiBFbWl0dGVkIHdoZW4gdGhlIGVuZC10by1lbmQgZW5jcnlwdGVkIHNlc3Npb24gaGFzIHRyYW5zaXRpb25lZFxuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb24oZXZlbnQ6ICd0cmFuc2l0aW9uZWQnLCBsaXN0ZW5lcjogKHRyYW5zaXRpb25JZDogbnVtYmVyKSA9PiB2b2lkKTogdGhpcztcbiAgLyoqXG4gICAqIEVtaXR0ZWQgd2hlbiB0aGUgc3RhdGUgb2YgdGhlIHZvaWNlIGNvbm5lY3Rpb24gY2hhbmdlcyB0byBhIHNwZWNpZmljIHN0YXR1c1xuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb248RXZlbnQgZXh0ZW5kcyBWb2ljZUNvbm5lY3Rpb25TdGF0dXM+KFxuICBldmVudDogRXZlbnQsXG4gIGxpc3RlbmVyOiAoXG4gIG9sZFN0YXRlOiBWb2ljZUNvbm5lY3Rpb25TdGF0ZSxcbiAgbmV3U3RhdGU6IFZvaWNlQ29ubmVjdGlvblN0YXRlICYge3N0YXR1czogRXZlbnQ7fSlcbiAgPT4gdm9pZClcbiAgOiB0aGlzO1xufVxuXG4vKipcbiAqIEEgY29ubmVjdGlvbiB0byB0aGUgdm9pY2Ugc2VydmVyIG9mIGEgR3VpbGQsIGNhbiBiZSB1c2VkIHRvIHBsYXkgYXVkaW8gaW4gdm9pY2UgY2hhbm5lbHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBWb2ljZUNvbm5lY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBjb25zZWN1dGl2ZSByZWpvaW4gYXR0ZW1wdHMuIEluaXRpYWxseSAwLCBhbmQgaW5jcmVtZW50cyBmb3IgZWFjaCByZWpvaW4uXG4gICAqIFdoZW4gYSBjb25uZWN0aW9uIGlzIHN1Y2Nlc3NmdWxseSBlc3RhYmxpc2hlZCwgaXQgcmVzZXRzIHRvIDAuXG4gICAqL1xuICBwdWJsaWMgcmVqb2luQXR0ZW1wdHM6IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHN0YXRlIG9mIHRoZSB2b2ljZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBfc3RhdGU6IFZvaWNlQ29ubmVjdGlvblN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGNvbmZpZ3VyYXRpb24gc3RvcmluZyBhbGwgdGhlIGRhdGEgbmVlZGVkIHRvIHJlY29ubmVjdCB0byBhIEd1aWxkJ3Mgdm9pY2Ugc2VydmVyLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBqb2luQ29uZmlnOiBKb2luQ29uZmlnO1xuXG4gIC8qKlxuICAgKiBUaGUgdHdvIHBhY2tldHMgbmVlZGVkIHRvIHN1Y2Nlc3NmdWxseSBlc3RhYmxpc2ggYSB2b2ljZSBjb25uZWN0aW9uLiBUaGV5IGFyZSByZWNlaXZlZFxuICAgKiBmcm9tIHRoZSBtYWluIERpc2NvcmQgZ2F0ZXdheSBhZnRlciBzaWduYWxsaW5nIHRvIGNoYW5nZSB0aGUgdm9pY2Ugc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IHBhY2tldHM6IHtcbiAgICBzZXJ2ZXI6IEdhdGV3YXlWb2ljZVNlcnZlclVwZGF0ZURpc3BhdGNoRGF0YSB8IHVuZGVmaW5lZDtcbiAgICBzdGF0ZTogR2F0ZXdheVZvaWNlU3RhdGVVcGRhdGVEaXNwYXRjaERhdGEgfCB1bmRlZmluZWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBkZWJ1ZyBsb2dnZXIgZnVuY3Rpb24sIGlmIGRlYnVnZ2luZyBpcyBlbmFibGVkLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBkZWJ1ZzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbDtcblxuICAvKipcbiAgICogVGhlIG9wdGlvbnMgdXNlZCB0byBjcmVhdGUgdGhpcyB2b2ljZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBDcmVhdGVWb2ljZUNvbm5lY3Rpb25PcHRpb25zO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHZvaWNlIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBqb2luQ29uZmlnIC0gVGhlIGRhdGEgcmVxdWlyZWQgdG8gZXN0YWJsaXNoIHRoZSB2b2ljZSBjb25uZWN0aW9uXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGhlIG9wdGlvbnMgdXNlZCB0byBjcmVhdGUgdGhpcyB2b2ljZSBjb25uZWN0aW9uXG4gICAqL1xuICBwdWJsaWMgY29uc3RydWN0b3IoXG4gIGpvaW5Db25maWc6IEpvaW5Db25maWcsXG4gIG9wdGlvbnM6IENyZWF0ZVZvaWNlQ29ubmVjdGlvbk9wdGlvbnMpXG4gIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5kZWJ1ZyA9IG9wdGlvbnMuZGVidWcgP1xuICAgIChtZXNzYWdlOiBzdHJpbmcpID0+IHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlKSA6XG4gICAgbnVsbDtcbiAgICB0aGlzLnJlam9pbkF0dGVtcHRzID0gMDtcblxuICAgIHRoaXMub25OZXR3b3JraW5nQ2xvc2UgPSB0aGlzLm9uTmV0d29ya2luZ0Nsb3NlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbk5ldHdvcmtpbmdTdGF0ZUNoYW5nZSA9IHRoaXMub25OZXR3b3JraW5nU3RhdGVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uTmV0d29ya2luZ0Vycm9yID0gdGhpcy5vbk5ldHdvcmtpbmdFcnJvci5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25OZXR3b3JraW5nRGVidWcgPSB0aGlzLm9uTmV0d29ya2luZ0RlYnVnLmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbk5ldHdvcmtpbmdUcmFuc2l0aW9uZWQgPSB0aGlzLm9uTmV0d29ya2luZ1RyYW5zaXRpb25lZC5iaW5kKHRoaXMpO1xuXG4gICAgY29uc3QgYWRhcHRlciA9IG9wdGlvbnMuYWRhcHRlckNyZWF0b3Ioe1xuICAgICAgb25Wb2ljZVNlcnZlclVwZGF0ZTogKGRhdGEpID0+IHRoaXMuYWRkU2VydmVyUGFja2V0KGRhdGEpLFxuICAgICAgb25Wb2ljZVN0YXRlVXBkYXRlOiAoZGF0YSkgPT4gdGhpcy5hZGRTdGF0ZVBhY2tldChkYXRhKSxcbiAgICAgIGRlc3Ryb3k6ICgpID0+IHRoaXMuZGVzdHJveShmYWxzZSlcbiAgICB9KTtcblxuICAgIHRoaXMuX3N0YXRlID0geyBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5TaWduYWxsaW5nLCBhZGFwdGVyIH07XG5cbiAgICB0aGlzLnBhY2tldHMgPSB7XG4gICAgICBzZXJ2ZXI6IHVuZGVmaW5lZCxcbiAgICAgIHN0YXRlOiB1bmRlZmluZWRcbiAgICB9O1xuXG4gICAgdGhpcy5qb2luQ29uZmlnID0gam9pbkNvbmZpZztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB2b2ljZSBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAcmVtYXJrc1xuICAgKiBUaGUgc2V0dGVyIHdpbGwgcGVyZm9ybSBjbGVhbi11cCBvcGVyYXRpb25zIHdoZXJlIG5lY2Vzc2FyeS5cbiAgICovXG4gIHB1YmxpYyBnZXQgc3RhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbiAgcHVibGljIHNldCBzdGF0ZShuZXdTdGF0ZTogVm9pY2VDb25uZWN0aW9uU3RhdGUpIHtcbiAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuX3N0YXRlO1xuICAgIGNvbnN0IG9sZE5ldHdvcmtpbmcgPSBSZWZsZWN0LmdldChvbGRTdGF0ZSwgJ25ldHdvcmtpbmcnKSBhc1xuICAgIE5ldHdvcmtpbmcgfFxuICAgIHVuZGVmaW5lZDtcbiAgICBjb25zdCBuZXdOZXR3b3JraW5nID0gUmVmbGVjdC5nZXQobmV3U3RhdGUsICduZXR3b3JraW5nJykgYXNcbiAgICBOZXR3b3JraW5nIHxcbiAgICB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBvbGRTdWJzY3JpcHRpb24gPSBSZWZsZWN0LmdldChvbGRTdGF0ZSwgJ3N1YnNjcmlwdGlvbicpIGFzXG4gICAgUGxheWVyU3Vic2NyaXB0aW9uIHxcbiAgICB1bmRlZmluZWQ7XG4gICAgY29uc3QgbmV3U3Vic2NyaXB0aW9uID0gUmVmbGVjdC5nZXQobmV3U3RhdGUsICdzdWJzY3JpcHRpb24nKSBhc1xuICAgIFBsYXllclN1YnNjcmlwdGlvbiB8XG4gICAgdW5kZWZpbmVkO1xuXG4gICAgaWYgKG9sZE5ldHdvcmtpbmcgIT09IG5ld05ldHdvcmtpbmcpIHtcbiAgICAgIGlmIChvbGROZXR3b3JraW5nKSB7XG4gICAgICAgIG9sZE5ldHdvcmtpbmcub24oJ2Vycm9yJywgbm9vcCk7XG4gICAgICAgIG9sZE5ldHdvcmtpbmcub2ZmKCdkZWJ1ZycsIHRoaXMub25OZXR3b3JraW5nRGVidWcpO1xuICAgICAgICBvbGROZXR3b3JraW5nLm9mZignZXJyb3InLCB0aGlzLm9uTmV0d29ya2luZ0Vycm9yKTtcbiAgICAgICAgb2xkTmV0d29ya2luZy5vZmYoJ2Nsb3NlJywgdGhpcy5vbk5ldHdvcmtpbmdDbG9zZSk7XG4gICAgICAgIG9sZE5ldHdvcmtpbmcub2ZmKCdzdGF0ZUNoYW5nZScsIHRoaXMub25OZXR3b3JraW5nU3RhdGVDaGFuZ2UpO1xuICAgICAgICBvbGROZXR3b3JraW5nLm9mZigndHJhbnNpdGlvbmVkJywgdGhpcy5vbk5ldHdvcmtpbmdUcmFuc2l0aW9uZWQpO1xuICAgICAgICBvbGROZXR3b3JraW5nLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobmV3U3RhdGUuc3RhdHVzID09PSBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuUmVhZHkpIHtcbiAgICAgIHRoaXMucmVqb2luQXR0ZW1wdHMgPSAwO1xuICAgIH1cblxuICAgIC8vIElmIGRlc3Ryb3llZCwgdGhlIGFkYXB0ZXIgY2FuIGFsc28gYmUgZGVzdHJveWVkIHNvIGl0IGNhbiBiZSBjbGVhbmVkIHVwIGJ5IHRoZSB1c2VyXG4gICAgaWYgKFxuICAgIG9sZFN0YXRlLnN0YXR1cyAhPT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCAmJlxuICAgIG5ld1N0YXRlLnN0YXR1cyA9PT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZClcbiAgICB7XG4gICAgICBvbGRTdGF0ZS5hZGFwdGVyLmRlc3Ryb3koKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZSA9IG5ld1N0YXRlO1xuXG4gICAgaWYgKG9sZFN1YnNjcmlwdGlvbiAmJiBvbGRTdWJzY3JpcHRpb24gIT09IG5ld1N1YnNjcmlwdGlvbikge1xuICAgICAgb2xkU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0KCdzdGF0ZUNoYW5nZScsIG9sZFN0YXRlLCBuZXdTdGF0ZSk7XG4gICAgaWYgKG9sZFN0YXRlLnN0YXR1cyAhPT0gbmV3U3RhdGUuc3RhdHVzKSB7XG4gICAgICB0aGlzLmVtaXQobmV3U3RhdGUuc3RhdHVzLCBvbGRTdGF0ZSwgbmV3U3RhdGUgYXMgdW5zYWZlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgYFZPSUNFX1NFUlZFUl9VUERBVEVgIHBhY2tldCB0byB0aGUgdm9pY2UgY29ubmVjdGlvbi4gVGhpcyB3aWxsIGNhdXNlIGl0IHRvIHJlY29ubmVjdCB1c2luZyB0aGVcbiAgICogbmV3IGRhdGEgcHJvdmlkZWQgaW4gdGhlIHBhY2tldC5cbiAgICpcbiAgICogQHBhcmFtIHBhY2tldCAtIFRoZSByZWNlaXZlZCBgVk9JQ0VfU0VSVkVSX1VQREFURWAgcGFja2V0XG4gICAqL1xuICBwcml2YXRlIGFkZFNlcnZlclBhY2tldChwYWNrZXQ6IEdhdGV3YXlWb2ljZVNlcnZlclVwZGF0ZURpc3BhdGNoRGF0YSkge1xuICAgIHRoaXMucGFja2V0cy5zZXJ2ZXIgPSBwYWNrZXQ7XG4gICAgaWYgKHBhY2tldC5lbmRwb2ludCkge1xuICAgICAgdGhpcy5jb25maWd1cmVOZXR3b3JraW5nKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlLnN0YXR1cyAhPT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkLFxuICAgICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uRW5kcG9pbnRSZW1vdmVkXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBgVk9JQ0VfU1RBVEVfVVBEQVRFYCBwYWNrZXQgdG8gdGhlIHZvaWNlIGNvbm5lY3Rpb24uIE1vc3QgaW1wb3J0YW50bHksIGl0IHN0b3JlcyB0aGUgaWQgb2YgdGhlXG4gICAqIGNoYW5uZWwgdGhhdCB0aGUgY2xpZW50IGlzIGNvbm5lY3RlZCB0by5cbiAgICpcbiAgICogQHBhcmFtIHBhY2tldCAtIFRoZSByZWNlaXZlZCBgVk9JQ0VfU1RBVEVfVVBEQVRFYCBwYWNrZXRcbiAgICovXG4gIHByaXZhdGUgYWRkU3RhdGVQYWNrZXQocGFja2V0OiBHYXRld2F5Vm9pY2VTdGF0ZVVwZGF0ZURpc3BhdGNoRGF0YSkge1xuICAgIHRoaXMucGFja2V0cy5zdGF0ZSA9IHBhY2tldDtcblxuICAgIGlmIChwYWNrZXQuc2VsZl9kZWFmICE9PSB1bmRlZmluZWQpXG4gICAgdGhpcy5qb2luQ29uZmlnLnNlbGZEZWFmID0gcGFja2V0LnNlbGZfZGVhZjtcbiAgICBpZiAocGFja2V0LnNlbGZfbXV0ZSAhPT0gdW5kZWZpbmVkKVxuICAgIHRoaXMuam9pbkNvbmZpZy5zZWxmTXV0ZSA9IHBhY2tldC5zZWxmX211dGU7XG4gICAgaWYgKHBhY2tldC5jaGFubmVsX2lkKSB0aGlzLmpvaW5Db25maWcuY2hhbm5lbElkID0gcGFja2V0LmNoYW5uZWxfaWQ7XG4gICAgLypcbiAgICB0aGUgY2hhbm5lbF9pZCBiZWluZyBudWxsIGRvZXNuJ3QgbmVjZXNzYXJpbHkgbWVhbiBpdCB3YXMgaW50ZW5kZWQgZm9yIHRoZSBjbGllbnQgdG8gbGVhdmUgdGhlIHZvaWNlIGNoYW5uZWxcbiAgICBhcyBpdCBtYXkgaGF2ZSBkaXNjb25uZWN0ZWQgZHVlIHRvIG5ldHdvcmsgZmFpbHVyZS4gVGhpcyB3aWxsIGJlIGdyYWNlZnVsbHkgaGFuZGxlZCBvbmNlIHRoZSB2b2ljZSB3ZWJzb2NrZXRcbiAgICBkaWVzLCBhbmQgdGhlbiBpdCBpcyB1cCB0byB0aGUgdXNlciB0byBkZWNpZGUgaG93IHRoZXkgd2lzaCB0byBoYW5kbGUgdGhpcy5cbiAgICAqL1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGNvbmZpZ3VyZSBhIG5ldHdvcmtpbmcgaW5zdGFuY2UgZm9yIHRoaXMgdm9pY2UgY29ubmVjdGlvbiB1c2luZyB0aGUgcmVjZWl2ZWQgcGFja2V0cy5cbiAgICogQm90aCBwYWNrZXRzIGFyZSByZXF1aXJlZCwgYW5kIGFueSBleGlzdGluZyBuZXR3b3JraW5nIGluc3RhbmNlIHdpbGwgYmUgZGVzdHJveWVkLlxuICAgKlxuICAgKiBAcmVtYXJrc1xuICAgKiBUaGlzIGlzIGNhbGxlZCB3aGVuIHRoZSB2b2ljZSBzZXJ2ZXIgb2YgdGhlIGNvbm5lY3Rpb24gY2hhbmdlcywgZS5nLiBpZiB0aGUgYm90IGlzIG1vdmVkIGludG8gYVxuICAgKiBkaWZmZXJlbnQgY2hhbm5lbCBpbiB0aGUgc2FtZSBndWlsZCBidXQgaGFzIGEgZGlmZmVyZW50IHZvaWNlIHNlcnZlci4gSW4gdGhpcyBpbnN0YW5jZSwgdGhlIGNvbm5lY3Rpb25cbiAgICogbmVlZHMgdG8gYmUgcmUtZXN0YWJsaXNoZWQgdG8gdGhlIG5ldyB2b2ljZSBzZXJ2ZXIuXG4gICAqXG4gICAqIFRoZSBjb25uZWN0aW9uIHdpbGwgdHJhbnNpdGlvbiB0byB0aGUgQ29ubmVjdGluZyBzdGF0ZSB3aGVuIHRoaXMgaXMgY2FsbGVkLlxuICAgKi9cbiAgcHVibGljIGNvbmZpZ3VyZU5ldHdvcmtpbmcoKSB7XG4gICAgY29uc3QgeyBzZXJ2ZXIsIHN0YXRlIH0gPSB0aGlzLnBhY2tldHM7XG4gICAgaWYgKFxuICAgICFzZXJ2ZXIgfHxcbiAgICAhc3RhdGUgfHxcbiAgICB0aGlzLnN0YXRlLnN0YXR1cyA9PT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCB8fFxuICAgICFzZXJ2ZXIuZW5kcG9pbnQpXG5cbiAgICByZXR1cm47XG5cbiAgICBjb25zdCBuZXR3b3JraW5nID0gbmV3IE5ldHdvcmtpbmcoXG4gICAgICB7XG4gICAgICAgIGVuZHBvaW50OiBzZXJ2ZXIuZW5kcG9pbnQsXG4gICAgICAgIHNlcnZlcklkOiBzZXJ2ZXIuZ3VpbGRfaWQsXG4gICAgICAgIHRva2VuOiBzZXJ2ZXIudG9rZW4sXG4gICAgICAgIHNlc3Npb25JZDogc3RhdGUuc2Vzc2lvbl9pZCxcbiAgICAgICAgdXNlcklkOiBzdGF0ZS51c2VyX2lkLFxuICAgICAgICBjaGFubmVsSWQ6IHN0YXRlLmNoYW5uZWxfaWQhXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBkZWJ1ZzogQm9vbGVhbih0aGlzLmRlYnVnKSxcbiAgICAgICAgZGF2ZUVuY3J5cHRpb246IHRoaXMub3B0aW9ucy5kYXZlRW5jcnlwdGlvbiA/PyB0cnVlLFxuICAgICAgICBkZWNyeXB0aW9uRmFpbHVyZVRvbGVyYW5jZTogdGhpcy5vcHRpb25zLmRlY3J5cHRpb25GYWlsdXJlVG9sZXJhbmNlXG4gICAgICB9XG4gICAgKTtcblxuICAgIG5ldHdvcmtpbmcub25jZSgnY2xvc2UnLCB0aGlzLm9uTmV0d29ya2luZ0Nsb3NlKTtcbiAgICBuZXR3b3JraW5nLm9uKCdzdGF0ZUNoYW5nZScsIHRoaXMub25OZXR3b3JraW5nU3RhdGVDaGFuZ2UpO1xuICAgIG5ldHdvcmtpbmcub24oJ2Vycm9yJywgdGhpcy5vbk5ldHdvcmtpbmdFcnJvcik7XG4gICAgbmV0d29ya2luZy5vbignZGVidWcnLCB0aGlzLm9uTmV0d29ya2luZ0RlYnVnKTtcbiAgICBuZXR3b3JraW5nLm9uKCd0cmFuc2l0aW9uZWQnLCB0aGlzLm9uTmV0d29ya2luZ1RyYW5zaXRpb25lZCk7XG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgIHN0YXR1czogVm9pY2VDb25uZWN0aW9uU3RhdHVzLkNvbm5lY3RpbmcsXG4gICAgICBuZXR3b3JraW5nXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgbmV0d29ya2luZyBpbnN0YW5jZSBmb3IgdGhpcyBjb25uZWN0aW9uIGNsb3Nlcy4gSWYgdGhlIGNsb3NlIGNvZGUgaXMgNDAxNCAoZG8gbm90IHJlY29ubmVjdCksXG4gICAqIHRoZSB2b2ljZSBjb25uZWN0aW9uIHdpbGwgdHJhbnNpdGlvbiB0byB0aGUgRGlzY29ubmVjdGVkIHN0YXRlIHdoaWNoIHdpbGwgc3RvcmUgdGhlIGNsb3NlIGNvZGUuIFlvdSBjYW5cbiAgICogZGVjaWRlIHdoZXRoZXIgb3Igbm90IHRvIHJlY29ubmVjdCB3aGVuIHRoaXMgb2NjdXJzIGJ5IGxpc3RlbmluZyBmb3IgdGhlIHN0YXRlIGNoYW5nZSBhbmQgY2FsbGluZyByZWNvbm5lY3QoKS5cbiAgICpcbiAgICogQHJlbWFya3NcbiAgICogSWYgdGhlIGNsb3NlIGNvZGUgd2FzIGFueXRoaW5nIG90aGVyIHRoYW4gNDAxNCwgaXQgaXMgbGlrZWx5IHRoYXQgdGhlIGNsb3Npbmcgd2FzIG5vdCBpbnRlbmRlZCwgYW5kIHNvIHRoZVxuICAgKiBWb2ljZUNvbm5lY3Rpb24gd2lsbCBzaWduYWwgdG8gRGlzY29yZCB0aGF0IGl0IHdvdWxkIGxpa2UgdG8gcmVqb2luIHRoZSBjaGFubmVsLiBUaGlzIGF1dG9tYXRpY2FsbHkgYXR0ZW1wdHNcbiAgICogdG8gcmUtZXN0YWJsaXNoIHRoZSBjb25uZWN0aW9uLiBUaGlzIHdvdWxkIGJlIHNlZW4gYXMgYSB0cmFuc2l0aW9uIGZyb20gdGhlIFJlYWR5IHN0YXRlIHRvIHRoZSBTaWduYWxsaW5nIHN0YXRlLlxuICAgKiBAcGFyYW0gY29kZSAtIFRoZSBjbG9zZSBjb2RlXG4gICAqL1xuICBwcml2YXRlIG9uTmV0d29ya2luZ0Nsb3NlKGNvZGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLnN0YXRlLnN0YXR1cyA9PT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCkgcmV0dXJuO1xuICAgIC8vIElmIG5ldHdvcmtpbmcgY2xvc2VzLCB0cnkgdG8gY29ubmVjdCB0byB0aGUgdm9pY2UgY2hhbm5lbCBhZ2Fpbi5cbiAgICBpZiAoY29kZSA9PT0gNF8wMTQpIHtcbiAgICAgIC8vIERpc2Nvbm5lY3RlZCAtIG5ldHdvcmtpbmcgaXMgYWxyZWFkeSBkZXN0cm95ZWQgaGVyZVxuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkLFxuICAgICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uV2ViU29ja2V0Q2xvc2UsXG4gICAgICAgIGNsb3NlQ29kZTogY29kZVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuU2lnbmFsbGluZ1xuICAgICAgfTtcbiAgICAgIHRoaXMucmVqb2luQXR0ZW1wdHMrKztcbiAgICAgIGlmIChcbiAgICAgICF0aGlzLnN0YXRlLmFkYXB0ZXIuc2VuZFBheWxvYWQoXG4gICAgICAgIGNyZWF0ZUpvaW5Wb2ljZUNoYW5uZWxQYXlsb2FkKHRoaXMuam9pbkNvbmZpZylcbiAgICAgICkpXG4gICAgICB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5EaXNjb25uZWN0ZWQsXG4gICAgICAgICAgcmVhc29uOiBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0UmVhc29uLkFkYXB0ZXJVbmF2YWlsYWJsZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgc3RhdGUgb2YgdGhlIG5ldHdvcmtpbmcgaW5zdGFuY2UgY2hhbmdlcy4gVGhpcyBpcyB1c2VkIHRvIGRlcml2ZSB0aGUgc3RhdGUgb2YgdGhlIHZvaWNlIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBvbGRTdGF0ZSAtIFRoZSBwcmV2aW91cyBzdGF0ZVxuICAgKiBAcGFyYW0gbmV3U3RhdGUgLSBUaGUgbmV3IHN0YXRlXG4gICAqL1xuICBwcml2YXRlIG9uTmV0d29ya2luZ1N0YXRlQ2hhbmdlKFxuICBvbGRTdGF0ZTogTmV0d29ya2luZ1N0YXRlLFxuICBuZXdTdGF0ZTogTmV0d29ya2luZ1N0YXRlKVxuICB7XG4gICAgaWYgKG9sZFN0YXRlLmNvZGUgPT09IG5ld1N0YXRlLmNvZGUpIHJldHVybjtcbiAgICBpZiAoXG4gICAgdGhpcy5zdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5Db25uZWN0aW5nICYmXG4gICAgdGhpcy5zdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeSlcblxuICAgIHJldHVybjtcblxuICAgIGlmIChuZXdTdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSkge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuUmVhZHlcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChuZXdTdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5DbG9zZWQpIHtcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIC4uLnRoaXMuc3RhdGUsXG4gICAgICAgIHN0YXR1czogVm9pY2VDb25uZWN0aW9uU3RhdHVzLkNvbm5lY3RpbmdcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgZXJyb3JzIGZyb20gdGhlIHVuZGVybHlpbmcgbmV0d29yayBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIHByb3BhZ2F0ZVxuICAgKi9cbiAgcHJpdmF0ZSBvbk5ldHdvcmtpbmdFcnJvcihlcnJvcjogRXJyb3IpIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgZGVidWcgbWVzc2FnZXMgZnJvbSB0aGUgdW5kZXJseWluZyBuZXR3b3JrIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlIHRvIHByb3BhZ2F0ZVxuICAgKi9cbiAgcHJpdmF0ZSBvbk5ldHdvcmtpbmdEZWJ1ZyhtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICB0aGlzLmRlYnVnPy4oYFtOV10gJHttZXNzYWdlfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgdHJhbnNpdGlvbnMgZnJvbSB0aGUgdW5kZXJseWluZyBuZXR3b3JrIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gdHJhbnNpdGlvbklkIC0gVGhlIHRyYW5zaXRpb24gaWRcbiAgICovXG4gIHByaXZhdGUgb25OZXR3b3JraW5nVHJhbnNpdGlvbmVkKHRyYW5zaXRpb25JZDogbnVtYmVyKSB7XG4gICAgdGhpcy5lbWl0KCd0cmFuc2l0aW9uZWQnLCB0cmFuc2l0aW9uSWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByZXBhcmVzIGFuIGF1ZGlvIHBhY2tldCBmb3IgZGlzcGF0Y2guXG4gICAqXG4gICAqIEBwYXJhbSBidWZmZXIgLSBUaGUgT3B1cyBwYWNrZXQgdG8gcHJlcGFyZVxuICAgKi9cbiAgcHVibGljIHByZXBhcmVBdWRpb1BhY2tldChidWZmZXI6IEJ1ZmZlcikge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5zdGF0ZTtcbiAgICBpZiAoc3RhdGUuc3RhdHVzICE9PSBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuUmVhZHkpIHJldHVybjtcbiAgICByZXR1cm4gc3RhdGUubmV0d29ya2luZy5wcmVwYXJlQXVkaW9QYWNrZXQoYnVmZmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIHRoZSBwcmV2aW91c2x5IHByZXBhcmVkIGF1ZGlvIHBhY2tldCAoaWYgYW55KVxuICAgKi9cbiAgcHVibGljIGRpc3BhdGNoQXVkaW8oKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgIGlmIChzdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeSkgcmV0dXJuO1xuICAgIHJldHVybiBzdGF0ZS5uZXR3b3JraW5nLmRpc3BhdGNoQXVkaW8oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlcyBhbiBhdWRpbyBwYWNrZXQgYW5kIGRpc3BhdGNoZXMgaXQgaW1tZWRpYXRlbHkuXG4gICAqXG4gICAqIEBwYXJhbSBidWZmZXIgLSBUaGUgT3B1cyBwYWNrZXQgdG8gcGxheVxuICAgKi9cbiAgcHVibGljIHBsYXlPcHVzUGFja2V0KGJ1ZmZlcjogQnVmZmVyKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgIGlmIChzdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeSkgcmV0dXJuO1xuICAgIHN0YXRlLm5ldHdvcmtpbmcucHJlcGFyZUF1ZGlvUGFja2V0KGJ1ZmZlcik7XG4gICAgcmV0dXJuIHN0YXRlLm5ldHdvcmtpbmcuZGlzcGF0Y2hBdWRpbygpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBWb2ljZUNvbm5lY3Rpb24sIHByZXZlbnRpbmcgaXQgZnJvbSBjb25uZWN0aW5nIHRvIHZvaWNlIGFnYWluLlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIHdoZW4geW91IG5vIGxvbmdlciByZXF1aXJlIHRoZSBWb2ljZUNvbm5lY3Rpb24gdG9cbiAgICogcHJldmVudCBtZW1vcnkgbGVha3MuXG4gICAqXG4gICAqIEBwYXJhbSBhZGFwdGVyQXZhaWxhYmxlIC0gV2hldGhlciB0aGUgYWRhcHRlciBjYW4gYmUgdXNlZFxuICAgKi9cbiAgcHVibGljIGRlc3Ryb3koYWRhcHRlckF2YWlsYWJsZSA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5zdGF0dXMgPT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5EZXN0cm95ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBkZXN0cm95IFZvaWNlQ29ubmVjdGlvbiAtIGl0IGhhcyBhbHJlYWR5IGJlZW4gZGVzdHJveWVkJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgZ2V0Vm9pY2VDb25uZWN0aW9uKHRoaXMuam9pbkNvbmZpZy5ndWlsZElkLCB0aGlzLmpvaW5Db25maWcuZ3JvdXApID09PVxuICAgIHRoaXMpXG4gICAge1xuICAgICAgdW50cmFja1ZvaWNlQ29ubmVjdGlvbih0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAoYWRhcHRlckF2YWlsYWJsZSkge1xuICAgICAgdGhpcy5zdGF0ZS5hZGFwdGVyLnNlbmRQYXlsb2FkKFxuICAgICAgICBjcmVhdGVKb2luVm9pY2VDaGFubmVsUGF5bG9hZCh7IC4uLnRoaXMuam9pbkNvbmZpZywgY2hhbm5lbElkOiBudWxsIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5EZXN0cm95ZWRcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3RzIHRoZSBWb2ljZUNvbm5lY3Rpb24sIGFsbG93aW5nIHRoZSBwb3NzaWJpbGl0eSBvZiByZWpvaW5pbmcgbGF0ZXIgb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgY29ubmVjdGlvbiB3YXMgc3VjY2Vzc2Z1bGx5IGRpc2Nvbm5lY3RlZFxuICAgKi9cbiAgcHVibGljIGRpc2Nvbm5lY3QoKSB7XG4gICAgaWYgKFxuICAgIHRoaXMuc3RhdGUuc3RhdHVzID09PSBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGVzdHJveWVkIHx8XG4gICAgdGhpcy5zdGF0ZS5zdGF0dXMgPT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5TaWduYWxsaW5nKVxuICAgIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLmpvaW5Db25maWcuY2hhbm5lbElkID0gbnVsbDtcbiAgICBpZiAoXG4gICAgIXRoaXMuc3RhdGUuYWRhcHRlci5zZW5kUGF5bG9hZChcbiAgICAgIGNyZWF0ZUpvaW5Wb2ljZUNoYW5uZWxQYXlsb2FkKHRoaXMuam9pbkNvbmZpZylcbiAgICApKVxuICAgIHtcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIGFkYXB0ZXI6IHRoaXMuc3RhdGUuYWRhcHRlcixcbiAgICAgICAgc3Vic2NyaXB0aW9uOiB0aGlzLnN0YXRlLnN1YnNjcmlwdGlvbixcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkLFxuICAgICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uQWRhcHRlclVuYXZhaWxhYmxlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBhZGFwdGVyOiB0aGlzLnN0YXRlLmFkYXB0ZXIsXG4gICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uTWFudWFsLFxuICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkXG4gICAgfTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byByZWpvaW4gKGJldHRlciBleHBsYW5hdGlvbiBzb29uOnRtOilcbiAgICpcbiAgICogQHJlbWFya3NcbiAgICogQ2FsbGluZyB0aGlzIG1ldGhvZCBzdWNjZXNzZnVsbHkgd2lsbCBhdXRvbWF0aWNhbGx5IGluY3JlbWVudCB0aGUgYHJlam9pbkF0dGVtcHRzYCBjb3VudGVyLFxuICAgKiB3aGljaCB5b3UgY2FuIHVzZSB0byBpbmZvcm0gd2hldGhlciBvciBub3QgeW91J2QgbGlrZSB0byBrZWVwIGF0dGVtcHRpbmcgdG8gcmVjb25uZWN0IHlvdXJcbiAgICogdm9pY2UgY29ubmVjdGlvbi5cbiAgICpcbiAgICogQSBzdGF0ZSB0cmFuc2l0aW9uIGZyb20gRGlzY29ubmVjdGVkIHRvIFNpZ25hbGxpbmcgd2lsbCBiZSBvYnNlcnZlZCB3aGVuIHRoaXMgaXMgY2FsbGVkLlxuICAgKi9cbiAgcHVibGljIHJlam9pbihqb2luQ29uZmlnPzogT21pdDxKb2luQ29uZmlnLCAnZ3JvdXAnIHwgJ2d1aWxkSWQnPikge1xuICAgIGlmICh0aGlzLnN0YXRlLnN0YXR1cyA9PT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG5vdFJlYWR5ID0gdGhpcy5zdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeTtcblxuICAgIGlmIChub3RSZWFkeSkgdGhpcy5yZWpvaW5BdHRlbXB0cysrO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5qb2luQ29uZmlnLCBqb2luQ29uZmlnKTtcbiAgICBpZiAoXG4gICAgdGhpcy5zdGF0ZS5hZGFwdGVyLnNlbmRQYXlsb2FkKFxuICAgICAgY3JlYXRlSm9pblZvaWNlQ2hhbm5lbFBheWxvYWQodGhpcy5qb2luQ29uZmlnKVxuICAgICkpXG4gICAge1xuICAgICAgaWYgKG5vdFJlYWR5KSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5TaWduYWxsaW5nXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBhZGFwdGVyOiB0aGlzLnN0YXRlLmFkYXB0ZXIsXG4gICAgICBzdWJzY3JpcHRpb246IHRoaXMuc3RhdGUuc3Vic2NyaXB0aW9uLFxuICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkLFxuICAgICAgcmVhc29uOiBWb2ljZUNvbm5lY3Rpb25EaXNjb25uZWN0UmVhc29uLkFkYXB0ZXJVbmF2YWlsYWJsZVxuICAgIH07XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHNwZWFraW5nIHN0YXR1cyBvZiB0aGUgdm9pY2UgY29ubmVjdGlvbi4gVGhpcyBpcyB1c2VkIHdoZW4gYXVkaW8gcGxheWVycyBhcmUgZG9uZSBwbGF5aW5nIGF1ZGlvLFxuICAgKiBhbmQgbmVlZCB0byBzaWduYWwgdGhhdCB0aGUgY29ubmVjdGlvbiBpcyBubyBsb25nZXIgcGxheWluZyBhdWRpby5cbiAgICpcbiAgICogQHBhcmFtIGVuYWJsZWQgLSBXaGV0aGVyIG9yIG5vdCB0byBzaG93IGFzIHNwZWFraW5nXG4gICAqL1xuICBwdWJsaWMgc2V0U3BlYWtpbmcoZW5hYmxlZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLnN0YXRlLnN0YXR1cyAhPT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLlJlYWR5KSByZXR1cm4gZmFsc2U7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1jb25mdXNpbmctdm9pZC1leHByZXNzaW9uXG4gICAgcmV0dXJuIHRoaXMuc3RhdGUubmV0d29ya2luZy5zZXRTcGVha2luZyhlbmFibGVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIHRvIGFuIGF1ZGlvIHBsYXllciwgYWxsb3dpbmcgdGhlIHBsYXllciB0byBwbGF5IGF1ZGlvIG9uIHRoaXMgdm9pY2UgY29ubmVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBsYXllciAtIFRoZSBhdWRpbyBwbGF5ZXIgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEByZXR1cm5zIFRoZSBjcmVhdGVkIHN1YnNjcmlwdGlvblxuICAgKi9cbiAgcHVibGljIHN1YnNjcmliZShwbGF5ZXI6IEF1ZGlvUGxheWVyKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuc3RhdHVzID09PSBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGVzdHJveWVkKSByZXR1cm47XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvblxuICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHBsYXllclsnc3Vic2NyaWJlJ10odGhpcyk7XG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgIHN1YnNjcmlwdGlvblxuICAgIH07XG5cbiAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBsYXRlc3QgcGluZyAoaW4gbWlsbGlzZWNvbmRzKSBmb3IgdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uIGFuZCBhdWRpbyBwbGF5YmFjayBmb3IgdGhpcyB2b2ljZVxuICAgKiBjb25uZWN0aW9uLCBpZiB0aGlzIGRhdGEgaXMgYXZhaWxhYmxlLlxuICAgKlxuICAgKiBAcmVtYXJrc1xuICAgKiBGb3IgdGhpcyBkYXRhIHRvIGJlIGF2YWlsYWJsZSwgdGhlIFZvaWNlQ29ubmVjdGlvbiBtdXN0IGJlIGluIHRoZSBSZWFkeSBzdGF0ZSwgYW5kIGl0cyB1bmRlcmx5aW5nXG4gICAqIFdlYlNvY2tldCBjb25uZWN0aW9uIGFuZCBVRFAgc29ja2V0IG11c3QgaGF2ZSBoYWQgYXQgbGVhc3Qgb25lIHBpbmctcG9uZyBleGNoYW5nZS5cbiAgICovXG4gIHB1YmxpYyBnZXQgcGluZygpIHtcbiAgICBpZiAoXG4gICAgdGhpcy5zdGF0ZS5zdGF0dXMgPT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeSAmJlxuICAgIHRoaXMuc3RhdGUubmV0d29ya2luZy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSlcbiAgICB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB3czogdGhpcy5zdGF0ZS5uZXR3b3JraW5nLnN0YXRlLndzLnBpbmcsXG4gICAgICAgIHVkcDogdGhpcy5zdGF0ZS5uZXR3b3JraW5nLnN0YXRlLnVkcC5waW5nXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB3czogdW5kZWZpbmVkLFxuICAgICAgdWRwOiB1bmRlZmluZWRcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IHZvaWNlIHByaXZhY3kgY29kZSBvZiB0aGUgZW5jcnlwdGVkIHNlc3Npb24uXG4gICAqXG4gICAqIEByZW1hcmtzXG4gICAqIEZvciB0aGlzIGRhdGEgdG8gYmUgYXZhaWxhYmxlLCB0aGUgVm9pY2VDb25uZWN0aW9uIG11c3QgYmUgaW4gdGhlIFJlYWR5IHN0YXRlLFxuICAgKiBhbmQgdGhlIGNvbm5lY3Rpb24gd291bGQgaGF2ZSB0byBiZSBlbmQtdG8tZW5kIGVuY3J5cHRlZC5cbiAgICovXG4gIHB1YmxpYyBnZXQgdm9pY2VQcml2YWN5Q29kZSgpIHtcbiAgICBpZiAoXG4gICAgdGhpcy5zdGF0ZS5zdGF0dXMgPT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeSAmJlxuICAgIHRoaXMuc3RhdGUubmV0d29ya2luZy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSlcbiAgICB7XG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5uZXR3b3JraW5nLnN0YXRlLmRhdmU/LnZvaWNlUHJpdmFjeUNvZGUgPz8gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgdmVyaWZpY2F0aW9uIGNvZGUgZm9yIGEgdXNlciBpbiB0aGUgc2Vzc2lvbi5cbiAgICpcbiAgICogQHRocm93cyBXaWxsIHRocm93IGlmIGVuZC10by1lbmQgZW5jcnlwdGlvbiBpcyBub3Qgb24gb3IgaWYgdGhlIHVzZXIgaWQgcHJvdmlkZWQgaXMgbm90IGluIHRoZSBzZXNzaW9uLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldFZlcmlmaWNhdGlvbkNvZGUodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChcbiAgICB0aGlzLnN0YXRlLnN0YXR1cyA9PT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLlJlYWR5ICYmXG4gICAgdGhpcy5zdGF0ZS5uZXR3b3JraW5nLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5ICYmXG4gICAgdGhpcy5zdGF0ZS5uZXR3b3JraW5nLnN0YXRlLmRhdmUpXG4gICAge1xuICAgICAgcmV0dXJuIHRoaXMuc3RhdGUubmV0d29ya2luZy5zdGF0ZS5kYXZlLmdldFZlcmlmaWNhdGlvbkNvZGUodXNlcklkKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gbm90IGF2YWlsYWJsZScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIGEgc3Vic2NyaXB0aW9uIG9mIHRoaXMgdm9pY2UgY29ubmVjdGlvbiB0byBhbiBhdWRpbyBwbGF5ZXIgaXMgcmVtb3ZlZC5cbiAgICpcbiAgICogQHBhcmFtIHN1YnNjcmlwdGlvbiAtIFRoZSByZW1vdmVkIHN1YnNjcmlwdGlvblxuICAgKi9cbiAgcHJvdGVjdGVkIG9uU3Vic2NyaXB0aW9uUmVtb3ZlZChzdWJzY3JpcHRpb246IFBsYXllclN1YnNjcmlwdGlvbikge1xuICAgIGlmIChcbiAgICB0aGlzLnN0YXRlLnN0YXR1cyAhPT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCAmJlxuICAgIHRoaXMuc3RhdGUuc3Vic2NyaXB0aW9uID09PSBzdWJzY3JpcHRpb24pXG4gICAge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgc3Vic2NyaXB0aW9uOiB1bmRlZmluZWRcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB2b2ljZSBjb25uZWN0aW9uLlxuICpcbiAqIEBwYXJhbSBqb2luQ29uZmlnIC0gVGhlIGRhdGEgcmVxdWlyZWQgdG8gZXN0YWJsaXNoIHRoZSB2b2ljZSBjb25uZWN0aW9uXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFRoZSBvcHRpb25zIHRvIHVzZSB3aGVuIGpvaW5pbmcgdGhlIHZvaWNlIGNoYW5uZWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZvaWNlQ29ubmVjdGlvbihcbmpvaW5Db25maWc6IEpvaW5Db25maWcsXG5vcHRpb25zOiBDcmVhdGVWb2ljZUNvbm5lY3Rpb25PcHRpb25zKVxue1xuICBjb25zdCBwYXlsb2FkID0gY3JlYXRlSm9pblZvaWNlQ2hhbm5lbFBheWxvYWQoam9pbkNvbmZpZyk7XG4gIGNvbnN0IGV4aXN0aW5nID0gZ2V0Vm9pY2VDb25uZWN0aW9uKGpvaW5Db25maWcuZ3VpbGRJZCwgam9pbkNvbmZpZy5ncm91cCk7XG4gIGlmIChleGlzdGluZyAmJiBleGlzdGluZy5zdGF0ZS5zdGF0dXMgIT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5EZXN0cm95ZWQpIHtcbiAgICBpZiAoZXhpc3Rpbmcuc3RhdGUuc3RhdHVzID09PSBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkKSB7XG4gICAgICBleGlzdGluZy5yZWpvaW4oe1xuICAgICAgICBjaGFubmVsSWQ6IGpvaW5Db25maWcuY2hhbm5lbElkLFxuICAgICAgICBzZWxmRGVhZjogam9pbkNvbmZpZy5zZWxmRGVhZixcbiAgICAgICAgc2VsZk11dGU6IGpvaW5Db25maWcuc2VsZk11dGVcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoIWV4aXN0aW5nLnN0YXRlLmFkYXB0ZXIuc2VuZFBheWxvYWQocGF5bG9hZCkpIHtcbiAgICAgIGV4aXN0aW5nLnN0YXRlID0ge1xuICAgICAgICAuLi5leGlzdGluZy5zdGF0ZSxcbiAgICAgICAgc3RhdHVzOiBWb2ljZUNvbm5lY3Rpb25TdGF0dXMuRGlzY29ubmVjdGVkLFxuICAgICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uQWRhcHRlclVuYXZhaWxhYmxlXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBleGlzdGluZztcbiAgfVxuXG4gIGNvbnN0IHZvaWNlQ29ubmVjdGlvbiA9IG5ldyBWb2ljZUNvbm5lY3Rpb24oam9pbkNvbmZpZywgb3B0aW9ucyk7XG4gIHRyYWNrVm9pY2VDb25uZWN0aW9uKHZvaWNlQ29ubmVjdGlvbik7XG4gIGlmIChcbiAgdm9pY2VDb25uZWN0aW9uLnN0YXRlLnN0YXR1cyAhPT0gVm9pY2VDb25uZWN0aW9uU3RhdHVzLkRlc3Ryb3llZCAmJlxuICAhdm9pY2VDb25uZWN0aW9uLnN0YXRlLmFkYXB0ZXIuc2VuZFBheWxvYWQocGF5bG9hZCkpXG4gIHtcbiAgICB2b2ljZUNvbm5lY3Rpb24uc3RhdGUgPSB7XG4gICAgICAuLi52b2ljZUNvbm5lY3Rpb24uc3RhdGUsXG4gICAgICBzdGF0dXM6IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5EaXNjb25uZWN0ZWQsXG4gICAgICByZWFzb246IFZvaWNlQ29ubmVjdGlvbkRpc2Nvbm5lY3RSZWFzb24uQWRhcHRlclVuYXZhaWxhYmxlXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB2b2ljZUNvbm5lY3Rpb247XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG5pbXBvcnQgeyBHYXRld2F5T3Bjb2RlcyB9IGZyb20gJ2Rpc2NvcmQtYXBpLXR5cGVzL3YxMCc7XG5pbXBvcnQgdHlwZSB7IFZvaWNlQ29ubmVjdGlvbiB9IGZyb20gJy4vVm9pY2VDb25uZWN0aW9uJztcbmltcG9ydCB0eXBlIHsgQXVkaW9QbGF5ZXIgfSBmcm9tICcuL2F1ZGlvL2luZGV4JztcblxuZXhwb3J0IGludGVyZmFjZSBKb2luQ29uZmlnIHtcbiAgY2hhbm5lbElkOiBzdHJpbmcgfCBudWxsO1xuICBncm91cDogc3RyaW5nO1xuICBndWlsZElkOiBzdHJpbmc7XG4gIHNlbGZEZWFmOiBib29sZWFuO1xuICBzZWxmTXV0ZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBTZW5kcyBhIHZvaWNlIHN0YXRlIHVwZGF0ZSB0byB0aGUgbWFpbiB3ZWJzb2NrZXQgc2hhcmQgb2YgYSBndWlsZCwgdG8gaW5kaWNhdGUgam9pbmluZy9sZWF2aW5nL21vdmluZyBhY3Jvc3NcbiAqIHZvaWNlIGNoYW5uZWxzLlxuICpcbiAqIEBwYXJhbSBjb25maWcgLSBUaGUgY29uZmlndXJhdGlvbiB0byB1c2Ugd2hlbiBqb2luaW5nIHRoZSB2b2ljZSBjaGFubmVsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVKb2luVm9pY2VDaGFubmVsUGF5bG9hZChjb25maWc6IEpvaW5Db25maWcpIHtcbiAgcmV0dXJuIHtcbiAgICBvcDogR2F0ZXdheU9wY29kZXMuVm9pY2VTdGF0ZVVwZGF0ZSxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaWQtbGVuZ3RoXG4gICAgZDoge1xuICAgICAgZ3VpbGRfaWQ6IGNvbmZpZy5ndWlsZElkLFxuICAgICAgY2hhbm5lbF9pZDogY29uZmlnLmNoYW5uZWxJZCxcbiAgICAgIHNlbGZfZGVhZjogY29uZmlnLnNlbGZEZWFmLFxuICAgICAgc2VsZl9tdXRlOiBjb25maWcuc2VsZk11dGVcbiAgICB9XG4gIH07XG59XG5cbi8vIFZvaWNlIENvbm5lY3Rpb25zXG5jb25zdCBncm91cHMgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgVm9pY2VDb25uZWN0aW9uPj4oKTtcbmdyb3Vwcy5zZXQoJ2RlZmF1bHQnLCBuZXcgTWFwKCkpO1xuXG5mdW5jdGlvbiBnZXRPckNyZWF0ZUdyb3VwKGdyb3VwOiBzdHJpbmcpIHtcbiAgY29uc3QgZXhpc3RpbmcgPSBncm91cHMuZ2V0KGdyb3VwKTtcbiAgaWYgKGV4aXN0aW5nKSByZXR1cm4gZXhpc3Rpbmc7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBWb2ljZUNvbm5lY3Rpb24+KCk7XG4gIGdyb3Vwcy5zZXQoZ3JvdXAsIG1hcCk7XG4gIHJldHVybiBtYXA7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBtYXAgb2YgZ3JvdXAgbmFtZXMgdG8gbWFwcyBvZiB2b2ljZSBjb25uZWN0aW9ucy4gQnkgZGVmYXVsdCwgYWxsIHZvaWNlIGNvbm5lY3Rpb25zXG4gKiBhcmUgY3JlYXRlZCB1bmRlciB0aGUgJ2RlZmF1bHQnIGdyb3VwLlxuICpcbiAqIEByZXR1cm5zIFRoZSBncm91cCBtYXBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEdyb3VwcygpIHtcbiAgcmV0dXJuIGdyb3Vwcztcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgYWxsIHRoZSB2b2ljZSBjb25uZWN0aW9ucyB1bmRlciB0aGUgJ2RlZmF1bHQnIGdyb3VwLlxuICpcbiAqIEBwYXJhbSBncm91cCAtIFRoZSBncm91cCB0byBsb29rIHVwXG4gKiBAcmV0dXJucyBUaGUgbWFwIG9mIHZvaWNlIGNvbm5lY3Rpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWb2ljZUNvbm5lY3Rpb25zKFxuZ3JvdXA/OiAnZGVmYXVsdCcpXG46IE1hcDxzdHJpbmcsIFZvaWNlQ29ubmVjdGlvbj47XG5cbi8qKlxuICogUmV0cmlldmVzIGFsbCB0aGUgdm9pY2UgY29ubmVjdGlvbnMgdW5kZXIgdGhlIGdpdmVuIGdyb3VwIG5hbWUuXG4gKlxuICogQHBhcmFtIGdyb3VwIC0gVGhlIGdyb3VwIHRvIGxvb2sgdXBcbiAqIEByZXR1cm5zIFRoZSBtYXAgb2Ygdm9pY2UgY29ubmVjdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZvaWNlQ29ubmVjdGlvbnMoXG5ncm91cDogc3RyaW5nKVxuOiBNYXA8c3RyaW5nLCBWb2ljZUNvbm5lY3Rpb24+IHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHJpZXZlcyBhbGwgdGhlIHZvaWNlIGNvbm5lY3Rpb25zIHVuZGVyIHRoZSBnaXZlbiBncm91cCBuYW1lLiBEZWZhdWx0cyB0byB0aGUgJ2RlZmF1bHQnIGdyb3VwLlxuICpcbiAqIEBwYXJhbSBncm91cCAtIFRoZSBncm91cCB0byBsb29rIHVwXG4gKiBAcmV0dXJucyBUaGUgbWFwIG9mIHZvaWNlIGNvbm5lY3Rpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWb2ljZUNvbm5lY3Rpb25zKGdyb3VwID0gJ2RlZmF1bHQnKSB7XG4gIHJldHVybiBncm91cHMuZ2V0KGdyb3VwKTtcbn1cblxuLyoqXG4gKiBGaW5kcyBhIHZvaWNlIGNvbm5lY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gZ3VpbGQgaWQgYW5kIGdyb3VwLiBEZWZhdWx0cyB0byB0aGUgJ2RlZmF1bHQnIGdyb3VwLlxuICpcbiAqIEBwYXJhbSBndWlsZElkIC0gVGhlIGd1aWxkIGlkIG9mIHRoZSB2b2ljZSBjb25uZWN0aW9uXG4gKiBAcGFyYW0gZ3JvdXAgLSB0aGUgZ3JvdXAgdGhhdCB0aGUgdm9pY2UgY29ubmVjdGlvbiB3YXMgcmVnaXN0ZXJlZCB3aXRoXG4gKiBAcmV0dXJucyBUaGUgdm9pY2UgY29ubmVjdGlvbiwgaWYgaXQgZXhpc3RzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWb2ljZUNvbm5lY3Rpb24oZ3VpbGRJZDogc3RyaW5nLCBncm91cCA9ICdkZWZhdWx0Jykge1xuICByZXR1cm4gZ2V0Vm9pY2VDb25uZWN0aW9ucyhncm91cCk/LmdldChndWlsZElkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVudHJhY2tWb2ljZUNvbm5lY3Rpb24odm9pY2VDb25uZWN0aW9uOiBWb2ljZUNvbm5lY3Rpb24pIHtcbiAgcmV0dXJuIGdldFZvaWNlQ29ubmVjdGlvbnModm9pY2VDb25uZWN0aW9uLmpvaW5Db25maWcuZ3JvdXApPy5kZWxldGUoXG4gICAgdm9pY2VDb25uZWN0aW9uLmpvaW5Db25maWcuZ3VpbGRJZFxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhY2tWb2ljZUNvbm5lY3Rpb24odm9pY2VDb25uZWN0aW9uOiBWb2ljZUNvbm5lY3Rpb24pIHtcbiAgcmV0dXJuIGdldE9yQ3JlYXRlR3JvdXAodm9pY2VDb25uZWN0aW9uLmpvaW5Db25maWcuZ3JvdXApLnNldChcbiAgICB2b2ljZUNvbm5lY3Rpb24uam9pbkNvbmZpZy5ndWlsZElkLFxuICAgIHZvaWNlQ29ubmVjdGlvblxuICApO1xufVxuXG4vLyBBdWRpbyBQbGF5ZXJzXG5cbi8vIEVhY2ggYXVkaW8gcGFja2V0IGlzIDIwbXMgbG9uZ1xuY29uc3QgRlJBTUVfTEVOR1RIID0gMjA7XG5cbmxldCBhdWRpb0N5Y2xlSW50ZXJ2YWw6IE5vZGVKUy5UaW1lb3V0IHwgdW5kZWZpbmVkO1xubGV0IG5leHRUaW1lID0gLTE7XG5cbi8qKlxuICogQSBsaXN0IG9mIGNyZWF0ZWQgYXVkaW8gcGxheWVycyB0aGF0IGFyZSBzdGlsbCBhY3RpdmUgYW5kIGhhdmVuJ3QgYmVlbiBkZXN0cm95ZWQuXG4gKi9cbmNvbnN0IGF1ZGlvUGxheWVyczogQXVkaW9QbGF5ZXJbXSA9IFtdO1xuXG4vKipcbiAqIENhbGxlZCByb3VnaGx5IGV2ZXJ5IDIwIG1pbGxpc2Vjb25kcy4gRGlzcGF0Y2hlcyBhdWRpbyBmcm9tIGFsbCBwbGF5ZXJzLCBhbmQgdGhlbiBnZXRzIHRoZSBwbGF5ZXJzIHRvIHByZXBhcmVcbiAqIHRoZSBuZXh0IGF1ZGlvIGZyYW1lLlxuICovXG5mdW5jdGlvbiBhdWRpb0N5Y2xlU3RlcCgpIHtcbiAgaWYgKG5leHRUaW1lID09PSAtMSkgcmV0dXJuO1xuXG4gIG5leHRUaW1lICs9IEZSQU1FX0xFTkdUSDtcbiAgY29uc3QgYXZhaWxhYmxlID0gYXVkaW9QbGF5ZXJzLmZpbHRlcigocGxheWVyKSA9PiBwbGF5ZXIuY2hlY2tQbGF5YWJsZSgpKTtcblxuICBmb3IgKGNvbnN0IHBsYXllciBvZiBhdmFpbGFibGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvblxuICAgIHBsYXllclsnX3N0ZXBEaXNwYXRjaCddKCk7XG4gIH1cblxuICBwcmVwYXJlTmV4dEF1ZGlvRnJhbWUoYXZhaWxhYmxlKTtcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBnZXRzIHRoZSBwbGF5ZXJzIHRoYXQgaGF2ZSBiZWVuIHBhc3NlZCBhcyBwYXJhbWV0ZXJzIHRvIHByZXBhcmUgYXVkaW8gZnJhbWVzIHRoYXQgY2FuIGJlIHBsYXllZFxuICogYXQgdGhlIHN0YXJ0IG9mIHRoZSBuZXh0IGN5Y2xlLlxuICovXG5mdW5jdGlvbiBwcmVwYXJlTmV4dEF1ZGlvRnJhbWUocGxheWVyczogQXVkaW9QbGF5ZXJbXSkge1xuICBjb25zdCBuZXh0UGxheWVyID0gcGxheWVycy5zaGlmdCgpO1xuXG4gIGlmICghbmV4dFBsYXllcikge1xuICAgIGlmIChuZXh0VGltZSA+PSAwKSB7XG4gICAgICBhdWRpb0N5Y2xlSW50ZXJ2YWwgPSBzZXRUaW1lb3V0KFxuICAgICAgICAoKSA9PiBhdWRpb0N5Y2xlU3RlcCgpLFxuICAgICAgICBNYXRoLm1heChuZXh0VGltZSAtIERhdGUubm93KCksIDEpXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uXG4gIG5leHRQbGF5ZXJbJ19zdGVwUHJlcGFyZSddKCk7XG5cbiAgLy8gc2V0SW1tZWRpYXRlIHRvIGF2b2lkIGxvbmcgYXVkaW8gcGxheWVyIGNoYWlucyBibG9ja2luZyBvdGhlciBzY2hlZHVsZWQgdGFza3NcbiAgc2V0SW1tZWRpYXRlKCgpID0+IHByZXBhcmVOZXh0QXVkaW9GcmFtZShwbGF5ZXJzKSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgb3Igbm90IHRoZSBnaXZlbiBhdWRpbyBwbGF5ZXIgaXMgYmVpbmcgZHJpdmVuIGJ5IHRoZSBkYXRhIHN0b3JlIGNsb2NrLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBUaGUgdGFyZ2V0IHRvIHRlc3QgZm9yXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgaXQgaXMgYmVpbmcgdHJhY2tlZCwgYGZhbHNlYCBvdGhlcndpc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0F1ZGlvUGxheWVyKHRhcmdldDogQXVkaW9QbGF5ZXIpIHtcbiAgcmV0dXJuIGF1ZGlvUGxheWVycy5pbmNsdWRlcyh0YXJnZXQpO1xufVxuXG4vKipcbiAqIEFkZHMgYW4gYXVkaW8gcGxheWVyIHRvIHRoZSBkYXRhIHN0b3JlIHRyYWNraW5nIGxpc3QsIGlmIGl0IGlzbid0IGFscmVhZHkgdGhlcmUuXG4gKlxuICogQHBhcmFtIHBsYXllciAtIFRoZSBwbGF5ZXIgdG8gdHJhY2tcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEF1ZGlvUGxheWVyKHBsYXllcjogQXVkaW9QbGF5ZXIpIHtcbiAgaWYgKGhhc0F1ZGlvUGxheWVyKHBsYXllcikpIHJldHVybiBwbGF5ZXI7XG4gIGF1ZGlvUGxheWVycy5wdXNoKHBsYXllcik7XG4gIGlmIChhdWRpb1BsYXllcnMubGVuZ3RoID09PSAxKSB7XG4gICAgbmV4dFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhdWRpb0N5Y2xlU3RlcCgpKTtcbiAgfVxuXG4gIHJldHVybiBwbGF5ZXI7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBhbiBhdWRpbyBwbGF5ZXIgZnJvbSB0aGUgZGF0YSBzdG9yZSB0cmFja2luZyBsaXN0LCBpZiBpdCBpcyBwcmVzZW50IHRoZXJlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVsZXRlQXVkaW9QbGF5ZXIocGxheWVyOiBBdWRpb1BsYXllcikge1xuICBjb25zdCBpbmRleCA9IGF1ZGlvUGxheWVycy5pbmRleE9mKHBsYXllcik7XG4gIGlmIChpbmRleCA9PT0gLTEpIHJldHVybjtcbiAgYXVkaW9QbGF5ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gIGlmIChhdWRpb1BsYXllcnMubGVuZ3RoID09PSAwKSB7XG4gICAgbmV4dFRpbWUgPSAtMTtcbiAgICBpZiAoYXVkaW9DeWNsZUludGVydmFsICE9PSB1bmRlZmluZWQpIGNsZWFyVGltZW91dChhdWRpb0N5Y2xlSW50ZXJ2YWwpO1xuICB9XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG4vKiBlc2xpbnQtZGlzYWJsZSBpZC1sZW5ndGggKi9cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZCwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1kZWNsYXJhdGlvbi1tZXJnaW5nICovXG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5pbXBvcnQgY3J5cHRvIGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ25vZGU6ZXZlbnRzJztcbmltcG9ydCB0eXBlIHtcbiAgVm9pY2VSZWNlaXZlUGF5bG9hZCxcbiAgVm9pY2VTcGVha2luZ0ZsYWdzIH0gZnJvbVxuJ2Rpc2NvcmQtYXBpLXR5cGVzL3ZvaWNlL3Y4JztcbmltcG9ydCB7IFZvaWNlRW5jcnlwdGlvbk1vZGUsIFZvaWNlT3Bjb2RlcyB9IGZyb20gJ2Rpc2NvcmQtYXBpLXR5cGVzL3ZvaWNlL3Y4JztcbmltcG9ydCB0eXBlIHsgQ2xvc2VFdmVudCB9IGZyb20gJ3dzJztcbmltcG9ydCAqIGFzIHNlY3JldGJveCBmcm9tICcuLi91dGlsL1NlY3JldGJveCc7XG5pbXBvcnQgeyBub29wIH0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCB7IERBVkVTZXNzaW9uLCBnZXRNYXhQcm90b2NvbFZlcnNpb24gfSBmcm9tICcuL0RBVkVTZXNzaW9uJztcbmltcG9ydCB7IFZvaWNlVURQU29ja2V0IH0gZnJvbSAnLi9Wb2ljZVVEUFNvY2tldCc7XG5pbXBvcnQgdHlwZSB7IEJpbmFyeVdlYlNvY2tldE1lc3NhZ2UgfSBmcm9tICcuL1ZvaWNlV2ViU29ja2V0JztcbmltcG9ydCB7IFZvaWNlV2ViU29ja2V0IH0gZnJvbSAnLi9Wb2ljZVdlYlNvY2tldCc7XG5cbi8vIFRoZSBudW1iZXIgb2YgYXVkaW8gY2hhbm5lbHMgcmVxdWlyZWQgYnkgRGlzY29yZFxuY29uc3QgQ0hBTk5FTFMgPSAyO1xuY29uc3QgVElNRVNUQU1QX0lOQyA9IDQ4XzAwMCAvIDEwMCAqIENIQU5ORUxTO1xuY29uc3QgTUFYX05PTkNFX1NJWkUgPSAyICoqIDMyIC0gMTtcblxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9FTkNSWVBUSU9OX01PREVTOiBWb2ljZUVuY3J5cHRpb25Nb2RlW10gPSBbXG5Wb2ljZUVuY3J5cHRpb25Nb2RlLkFlYWRYQ2hhQ2hhMjBQb2x5MTMwNVJ0cFNpemVdO1xuXG5cbi8vIEp1c3QgaW4gY2FzZSB0aGVyZSdzIHNvbWUgc3lzdGVtIHRoYXQgZG9lc24ndCBjb21lIHdpdGggYWVzLTI1Ni1nY20sIGNvbmRpdGlvbmFsbHkgYWRkIGl0IGFzIHN1cHBvcnRlZFxuaWYgKGNyeXB0by5nZXRDaXBoZXJzKCkuaW5jbHVkZXMoJ2Flcy0yNTYtZ2NtJykpIHtcbiAgU1VQUE9SVEVEX0VOQ1JZUFRJT05fTU9ERVMudW5zaGlmdChWb2ljZUVuY3J5cHRpb25Nb2RlLkFlYWRBZXMyNTZHY21SdHBTaXplKTtcbn1cblxuLyoqXG4gKiBUaGUgZGlmZmVyZW50IHN0YXR1c2VzIHRoYXQgYSBuZXR3b3JraW5nIGluc3RhbmNlIGNhbiBob2xkLiBUaGUgb3JkZXJcbiAqIG9mIHRoZSBzdGF0ZXMgYmV0d2VlbiBPcGVuaW5nV3MgYW5kIFJlYWR5IGlzIGNocm9ub2xvZ2ljYWwgKGZpcnN0IHRoZVxuICogaW5zdGFuY2UgZW50ZXJzIE9wZW5pbmdXcywgdGhlbiBpdCBlbnRlcnMgSWRlbnRpZnlpbmcgZXRjLilcbiAqL1xuZXhwb3J0IGVudW0gTmV0d29ya2luZ1N0YXR1c0NvZGUge1xuICBPcGVuaW5nV3MsXG4gIElkZW50aWZ5aW5nLFxuICBVZHBIYW5kc2hha2luZyxcbiAgU2VsZWN0aW5nUHJvdG9jb2wsXG4gIFJlYWR5LFxuICBSZXN1bWluZyxcbiAgQ2xvc2VkLFxufVxuXG4vKipcbiAqIFRoZSBpbml0aWFsIE5ldHdvcmtpbmcgc3RhdGUuIEluc3RhbmNlcyB3aWxsIGJlIGluIHRoaXMgc3RhdGUgd2hlbiBhIFdlYlNvY2tldCBjb25uZWN0aW9uIHRvIGEgRGlzY29yZFxuICogdm9pY2UgZ2F0ZXdheSBpcyBiZWluZyBvcGVuZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZ09wZW5pbmdXc1N0YXRlIHtcbiAgY29kZTogTmV0d29ya2luZ1N0YXR1c0NvZGUuT3BlbmluZ1dzO1xuICBjb25uZWN0aW9uT3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnM7XG4gIHdzOiBWb2ljZVdlYlNvY2tldDtcbn1cblxuLyoqXG4gKiBUaGUgc3RhdGUgdGhhdCBhIE5ldHdvcmtpbmcgaW5zdGFuY2Ugd2lsbCBiZSBpbiB3aGVuIGl0IGlzIGF0dGVtcHRpbmcgdG8gYXV0aG9yaXplIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JraW5nSWRlbnRpZnlpbmdTdGF0ZSB7XG4gIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLklkZW50aWZ5aW5nO1xuICBjb25uZWN0aW9uT3B0aW9uczogQ29ubmVjdGlvbk9wdGlvbnM7XG4gIHdzOiBWb2ljZVdlYlNvY2tldDtcbn1cblxuLyoqXG4gKiBUaGUgc3RhdGUgdGhhdCBhIE5ldHdvcmtpbmcgaW5zdGFuY2Ugd2lsbCBiZSBpbiB3aGVuIG9wZW5pbmcgYSBVRFAgY29ubmVjdGlvbiB0byB0aGUgSVAgYW5kIHBvcnQgcHJvdmlkZWRcbiAqIGJ5IERpc2NvcmQsIGFzIHdlbGwgYXMgcGVyZm9ybWluZyBJUCBkaXNjb3ZlcnkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZ1VkcEhhbmRzaGFraW5nU3RhdGUge1xuICBjb2RlOiBOZXR3b3JraW5nU3RhdHVzQ29kZS5VZHBIYW5kc2hha2luZztcbiAgY29ubmVjdGlvbkRhdGE6IFBpY2s8Q29ubmVjdGlvbkRhdGEsICdjb25uZWN0ZWRDbGllbnRzJyB8ICdzc3JjJz47XG4gIGNvbm5lY3Rpb25PcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucztcbiAgdWRwOiBWb2ljZVVEUFNvY2tldDtcbiAgd3M6IFZvaWNlV2ViU29ja2V0O1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgTmV0d29ya2luZyBpbnN0YW5jZSB3aWxsIGJlIGluIHdoZW4gc2VsZWN0aW5nIGFuIGVuY3J5cHRpb24gcHJvdG9jb2wgZm9yIGF1ZGlvIHBhY2tldHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZ1NlbGVjdGluZ1Byb3RvY29sU3RhdGUge1xuICBjb2RlOiBOZXR3b3JraW5nU3RhdHVzQ29kZS5TZWxlY3RpbmdQcm90b2NvbDtcbiAgY29ubmVjdGlvbkRhdGE6IFBpY2s8Q29ubmVjdGlvbkRhdGEsICdjb25uZWN0ZWRDbGllbnRzJyB8ICdzc3JjJz47XG4gIGNvbm5lY3Rpb25PcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucztcbiAgdWRwOiBWb2ljZVVEUFNvY2tldDtcbiAgd3M6IFZvaWNlV2ViU29ja2V0O1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgTmV0d29ya2luZyBpbnN0YW5jZSB3aWxsIGJlIGluIHdoZW4gaXQgaGFzIGEgZnVsbHkgZXN0YWJsaXNoZWQgY29ubmVjdGlvbiB0byBhIERpc2NvcmRcbiAqIHZvaWNlIHNlcnZlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JraW5nUmVhZHlTdGF0ZSB7XG4gIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5O1xuICBjb25uZWN0aW9uRGF0YTogQ29ubmVjdGlvbkRhdGE7XG4gIGNvbm5lY3Rpb25PcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucztcbiAgZGF2ZT86IERBVkVTZXNzaW9uIHwgdW5kZWZpbmVkO1xuICBwcmVwYXJlZFBhY2tldD86IEJ1ZmZlciB8IHVuZGVmaW5lZDtcbiAgdWRwOiBWb2ljZVVEUFNvY2tldDtcbiAgd3M6IFZvaWNlV2ViU29ja2V0O1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgTmV0d29ya2luZyBpbnN0YW5jZSB3aWxsIGJlIGluIHdoZW4gaXRzIGNvbm5lY3Rpb24gaGFzIGJlZW4gZHJvcHBlZCB1bmV4cGVjdGVkbHksIGFuZCBpdFxuICogaXMgYXR0ZW1wdGluZyB0byByZXN1bWUgYW4gZXhpc3Rpbmcgc2Vzc2lvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JraW5nUmVzdW1pbmdTdGF0ZSB7XG4gIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlc3VtaW5nO1xuICBjb25uZWN0aW9uRGF0YTogQ29ubmVjdGlvbkRhdGE7XG4gIGNvbm5lY3Rpb25PcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucztcbiAgZGF2ZT86IERBVkVTZXNzaW9uIHwgdW5kZWZpbmVkO1xuICBwcmVwYXJlZFBhY2tldD86IEJ1ZmZlciB8IHVuZGVmaW5lZDtcbiAgdWRwOiBWb2ljZVVEUFNvY2tldDtcbiAgd3M6IFZvaWNlV2ViU29ja2V0O1xufVxuXG4vKipcbiAqIFRoZSBzdGF0ZSB0aGF0IGEgTmV0d29ya2luZyBpbnN0YW5jZSB3aWxsIGJlIGluIHdoZW4gaXQgaGFzIGJlZW4gZGVzdHJveWVkLiBJdCBjYW5ub3QgYmUgcmVjb3ZlcmVkIGZyb20gdGhpc1xuICogc3RhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZ0Nsb3NlZFN0YXRlIHtcbiAgY29kZTogTmV0d29ya2luZ1N0YXR1c0NvZGUuQ2xvc2VkO1xufVxuXG4vKipcbiAqIFRoZSB2YXJpb3VzIHN0YXRlcyB0aGF0IGEgbmV0d29ya2luZyBpbnN0YW5jZSBjYW4gYmUgaW4uXG4gKi9cbmV4cG9ydCB0eXBlIE5ldHdvcmtpbmdTdGF0ZSA9XG5OZXR3b3JraW5nQ2xvc2VkU3RhdGUgfFxuTmV0d29ya2luZ0lkZW50aWZ5aW5nU3RhdGUgfFxuTmV0d29ya2luZ09wZW5pbmdXc1N0YXRlIHxcbk5ldHdvcmtpbmdSZWFkeVN0YXRlIHxcbk5ldHdvcmtpbmdSZXN1bWluZ1N0YXRlIHxcbk5ldHdvcmtpbmdTZWxlY3RpbmdQcm90b2NvbFN0YXRlIHxcbk5ldHdvcmtpbmdVZHBIYW5kc2hha2luZ1N0YXRlO1xuXG4vKipcbiAqIERldGFpbHMgcmVxdWlyZWQgdG8gY29ubmVjdCB0byB0aGUgRGlzY29yZCB2b2ljZSBnYXRld2F5LiBUaGVzZSBkZXRhaWxzXG4gKiBhcmUgZmlyc3QgcmVjZWl2ZWQgb24gdGhlIG1haW4gYm90IGdhdGV3YXksIGluIHRoZSBmb3JtIG9mIFZPSUNFX1NFUlZFUl9VUERBVEVcbiAqIGFuZCBWT0lDRV9TVEFURV9VUERBVEUgcGFja2V0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uT3B0aW9ucyB7XG4gIGNoYW5uZWxJZDogc3RyaW5nO1xuICBlbmRwb2ludDogc3RyaW5nO1xuICBzZXJ2ZXJJZDogc3RyaW5nO1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdG9rZW46IHN0cmluZztcbiAgdXNlcklkOiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiwgZS5nLiB3aGljaCBlbmNyeXB0aW9uIG1vZGUgaXMgdG8gYmUgdXNlZCBvblxuICogdGhlIGNvbm5lY3Rpb24sIHRpbWluZyBpbmZvcm1hdGlvbiBmb3IgcGxheWJhY2sgb2Ygc3RyZWFtcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uRGF0YSB7XG4gIGNvbm5lY3RlZENsaWVudHM6IFNldDxzdHJpbmc+O1xuICBlbmNyeXB0aW9uTW9kZTogc3RyaW5nO1xuICBub25jZTogbnVtYmVyO1xuICBub25jZUJ1ZmZlcjogQnVmZmVyO1xuICBwYWNrZXRzUGxheWVkOiBudW1iZXI7XG4gIHNlY3JldEtleTogVWludDhBcnJheTtcbiAgc2VxdWVuY2U6IG51bWJlcjtcbiAgc3BlYWtpbmc6IGJvb2xlYW47XG4gIHNzcmM6IG51bWJlcjtcbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgbmV0d29ya2luZyB0aGF0IGRpY3RhdGUgYmVoYXZpb3IuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZ09wdGlvbnMge1xuICBkYXZlRW5jcnlwdGlvbj86IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG4gIGRlYnVnPzogYm9vbGVhbiB8IHVuZGVmaW5lZDtcbiAgZGVjcnlwdGlvbkZhaWx1cmVUb2xlcmFuY2U/OiBudW1iZXIgfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQW4gZW1wdHkgYnVmZmVyIHRoYXQgaXMgcmV1c2VkIGluIHBhY2tldCBlbmNyeXB0aW9uIGJ5IG1hbnkgZGlmZmVyZW50IG5ldHdvcmtpbmcgaW5zdGFuY2VzLlxuICovXG5jb25zdCBub25jZSA9IEJ1ZmZlci5hbGxvYygyNCk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya2luZyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBEZWJ1ZyBldmVudCBmb3IgTmV0d29ya2luZy5cbiAgICpcbiAgICogQGV2ZW50UHJvcGVydHlcbiAgICovXG4gIG9uKGV2ZW50OiAnZGVidWcnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZXJyb3InLCBsaXN0ZW5lcjogKGVycm9yOiBFcnJvcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKFxuICBldmVudDogJ3N0YXRlQ2hhbmdlJyxcbiAgbGlzdGVuZXI6IChvbGRTdGF0ZTogTmV0d29ya2luZ1N0YXRlLCBuZXdTdGF0ZTogTmV0d29ya2luZ1N0YXRlKSA9PiB2b2lkKVxuICA6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2xvc2UnLCBsaXN0ZW5lcjogKGNvZGU6IG51bWJlcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAndHJhbnNpdGlvbmVkJywgbGlzdGVuZXI6ICh0cmFuc2l0aW9uSWQ6IG51bWJlcikgPT4gdm9pZCk6IHRoaXM7XG59XG5cbi8qKlxuICogU3RyaW5naWZpZXMgYSBOZXR3b3JraW5nU3RhdGUuXG4gKlxuICogQHBhcmFtIHN0YXRlIC0gVGhlIHN0YXRlIHRvIHN0cmluZ2lmeVxuICovXG5mdW5jdGlvbiBzdHJpbmdpZnlTdGF0ZShzdGF0ZTogTmV0d29ya2luZ1N0YXRlKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgLi4uc3RhdGUsXG4gICAgd3M6IFJlZmxlY3QuaGFzKHN0YXRlLCAnd3MnKSxcbiAgICB1ZHA6IFJlZmxlY3QuaGFzKHN0YXRlLCAndWRwJylcbiAgfSk7XG59XG5cbi8qKlxuICogQ2hvb3NlcyBhbiBlbmNyeXB0aW9uIG1vZGUgZnJvbSBhIGxpc3Qgb2YgZ2l2ZW4gb3B0aW9ucy4gQ2hvb3NlcyB0aGUgbW9zdCBwcmVmZXJyZWQgb3B0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIC0gVGhlIGF2YWlsYWJsZSBlbmNyeXB0aW9uIG9wdGlvbnNcbiAqL1xuZnVuY3Rpb24gY2hvb3NlRW5jcnlwdGlvbk1vZGUoXG5vcHRpb25zOiBWb2ljZUVuY3J5cHRpb25Nb2RlW10pXG46IFZvaWNlRW5jcnlwdGlvbk1vZGUge1xuICBjb25zdCBvcHRpb24gPSBvcHRpb25zLmZpbmQoKG9wdGlvbikgPT5cbiAgU1VQUE9SVEVEX0VOQ1JZUFRJT05fTU9ERVMuaW5jbHVkZXMob3B0aW9uKVxuICApO1xuICBpZiAoIW9wdGlvbikge1xuICAgIC8vIFRoaXMgc2hvdWxkIG9ubHkgZXZlciBoYXBwZW4gaWYgdGhlIGdhdGV3YXkgZG9lcyBub3QgZ2l2ZSB1cyBhbnkgZW5jcnlwdGlvbiBtb2RlcyB3ZSBzdXBwb3J0LlxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBObyBjb21wYXRpYmxlIGVuY3J5cHRpb24gbW9kZXMuIEF2YWlsYWJsZSBpbmNsdWRlOiAke29wdGlvbnMuam9pbihcbiAgICAgICAgJywgJ1xuICAgICAgKX1gXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb247XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHJhbmRvbSBudW1iZXIgdGhhdCBpcyBpbiB0aGUgcmFuZ2Ugb2YgbiBiaXRzLlxuICpcbiAqIEBwYXJhbSBudW1iZXJPZkJpdHMgLSBUaGUgbnVtYmVyIG9mIGJpdHNcbiAqL1xuZnVuY3Rpb24gcmFuZG9tTkJpdChudW1iZXJPZkJpdHM6IG51bWJlcikge1xuICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMiAqKiBudW1iZXJPZkJpdHMpO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgdGhlIG5ldHdvcmtpbmcgcmVxdWlyZWQgdG8gbWFpbnRhaW4gYSB2b2ljZSBjb25uZWN0aW9uIGFuZCBkaXNwYXRjaCBhdWRpbyBwYWNrZXRzXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JraW5nIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgcHJpdmF0ZSBfc3RhdGU6IE5ldHdvcmtpbmdTdGF0ZTtcblxuICAvKipcbiAgICogVGhlIGRlYnVnIGxvZ2dlciBmdW5jdGlvbiwgaWYgZGVidWdnaW5nIGlzIGVuYWJsZWQuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgb3B0aW9ucyB1c2VkIHRvIGNyZWF0ZSB0aGlzIE5ldHdvcmtpbmcgaW5zdGFuY2UuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IE5ldHdvcmtpbmdPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtpbmcgaW5zdGFuY2UuXG4gICAqL1xuICBwdWJsaWMgY29uc3RydWN0b3IoXG4gIGNvbm5lY3Rpb25PcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyxcbiAgb3B0aW9uczogTmV0d29ya2luZ09wdGlvbnMpXG4gIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5vbldzT3BlbiA9IHRoaXMub25Xc09wZW4uYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uQ2hpbGRFcnJvciA9IHRoaXMub25DaGlsZEVycm9yLmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbldzUGFja2V0ID0gdGhpcy5vbldzUGFja2V0LmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbldzQmluYXJ5ID0gdGhpcy5vbldzQmluYXJ5LmJpbmQodGhpcyk7XG4gICAgdGhpcy5vbldzQ2xvc2UgPSB0aGlzLm9uV3NDbG9zZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Xc0RlYnVnID0gdGhpcy5vbldzRGVidWcuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uVWRwRGVidWcgPSB0aGlzLm9uVWRwRGVidWcuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uVWRwQ2xvc2UgPSB0aGlzLm9uVWRwQ2xvc2UuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uRGF2ZURlYnVnID0gdGhpcy5vbkRhdmVEZWJ1Zy5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25EYXZlS2V5UGFja2FnZSA9IHRoaXMub25EYXZlS2V5UGFja2FnZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25EYXZlSW52YWxpZGF0ZVRyYW5zaXRpb24gPVxuICAgIHRoaXMub25EYXZlSW52YWxpZGF0ZVRyYW5zaXRpb24uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuZGVidWcgPSBvcHRpb25zPy5kZWJ1ZyA/XG4gICAgKG1lc3NhZ2U6IHN0cmluZykgPT4gdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UpIDpcbiAgICBudWxsO1xuXG4gICAgdGhpcy5fc3RhdGUgPSB7XG4gICAgICBjb2RlOiBOZXR3b3JraW5nU3RhdHVzQ29kZS5PcGVuaW5nV3MsXG4gICAgICB3czogdGhpcy5jcmVhdGVXZWJTb2NrZXQoY29ubmVjdGlvbk9wdGlvbnMuZW5kcG9pbnQpLFxuICAgICAgY29ubmVjdGlvbk9wdGlvbnNcbiAgICB9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIE5ldHdvcmtpbmcgaW5zdGFuY2UsIHRyYW5zaXRpb25pbmcgaXQgaW50byB0aGUgQ2xvc2VkIHN0YXRlLlxuICAgKi9cbiAgcHVibGljIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLkNsb3NlZFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIG5ldHdvcmtpbmcgaW5zdGFuY2UuXG4gICAqXG4gICAqIEByZW1hcmtzXG4gICAqIFRoZSBzZXR0ZXIgd2lsbCBwZXJmb3JtIGNsZWFuLXVwIG9wZXJhdGlvbnMgd2hlcmUgbmVjZXNzYXJ5LlxuICAgKi9cbiAgcHVibGljIGdldCBzdGF0ZSgpOiBOZXR3b3JraW5nU3RhdGUge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4gIHB1YmxpYyBzZXQgc3RhdGUobmV3U3RhdGU6IE5ldHdvcmtpbmdTdGF0ZSkge1xuICAgIGNvbnN0IG9sZFdzID0gUmVmbGVjdC5nZXQodGhpcy5fc3RhdGUsICd3cycpIGFzIFZvaWNlV2ViU29ja2V0IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG5ld1dzID0gUmVmbGVjdC5nZXQobmV3U3RhdGUsICd3cycpIGFzIFZvaWNlV2ViU29ja2V0IHwgdW5kZWZpbmVkO1xuICAgIGlmIChvbGRXcyAmJiBvbGRXcyAhPT0gbmV3V3MpIHtcbiAgICAgIC8vIFRoZSBvbGQgV2ViU29ja2V0IGlzIGJlaW5nIGZyZWVkIC0gcmVtb3ZlIGFsbCBoYW5kbGVycyBmcm9tIGl0XG4gICAgICBvbGRXcy5vZmYoJ2RlYnVnJywgdGhpcy5vbldzRGVidWcpO1xuICAgICAgb2xkV3Mub24oJ2Vycm9yJywgbm9vcCk7XG4gICAgICBvbGRXcy5vZmYoJ2Vycm9yJywgdGhpcy5vbkNoaWxkRXJyb3IpO1xuICAgICAgb2xkV3Mub2ZmKCdvcGVuJywgdGhpcy5vbldzT3Blbik7XG4gICAgICBvbGRXcy5vZmYoJ3BhY2tldCcsIHRoaXMub25Xc1BhY2tldCk7XG4gICAgICBvbGRXcy5vZmYoJ2JpbmFyeScsIHRoaXMub25Xc0JpbmFyeSk7XG4gICAgICBvbGRXcy5vZmYoJ2Nsb3NlJywgdGhpcy5vbldzQ2xvc2UpO1xuICAgICAgb2xkV3MuZGVzdHJveSgpO1xuICAgIH1cblxuICAgIGNvbnN0IG9sZFVkcCA9IFJlZmxlY3QuZ2V0KHRoaXMuX3N0YXRlLCAndWRwJykgYXNcbiAgICBWb2ljZVVEUFNvY2tldCB8XG4gICAgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG5ld1VkcCA9IFJlZmxlY3QuZ2V0KG5ld1N0YXRlLCAndWRwJykgYXMgVm9pY2VVRFBTb2NrZXQgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAob2xkVWRwICYmIG9sZFVkcCAhPT0gbmV3VWRwKSB7XG4gICAgICBvbGRVZHAub24oJ2Vycm9yJywgbm9vcCk7XG4gICAgICBvbGRVZHAub2ZmKCdlcnJvcicsIHRoaXMub25DaGlsZEVycm9yKTtcbiAgICAgIG9sZFVkcC5vZmYoJ2Nsb3NlJywgdGhpcy5vblVkcENsb3NlKTtcbiAgICAgIG9sZFVkcC5vZmYoJ2RlYnVnJywgdGhpcy5vblVkcERlYnVnKTtcbiAgICAgIG9sZFVkcC5kZXN0cm95KCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb2xkRGF2ZSA9IFJlZmxlY3QuZ2V0KHRoaXMuX3N0YXRlLCAnZGF2ZScpIGFzIERBVkVTZXNzaW9uIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG5ld0RhdmUgPSBSZWZsZWN0LmdldChuZXdTdGF0ZSwgJ2RhdmUnKSBhcyBEQVZFU2Vzc2lvbiB8IHVuZGVmaW5lZDtcblxuICAgIGlmIChvbGREYXZlICYmIG9sZERhdmUgIT09IG5ld0RhdmUpIHtcbiAgICAgIG9sZERhdmUub2ZmKCdlcnJvcicsIHRoaXMub25DaGlsZEVycm9yKTtcbiAgICAgIG9sZERhdmUub2ZmKCdkZWJ1ZycsIHRoaXMub25EYXZlRGVidWcpO1xuICAgICAgb2xkRGF2ZS5vZmYoJ2tleVBhY2thZ2UnLCB0aGlzLm9uRGF2ZUtleVBhY2thZ2UpO1xuICAgICAgb2xkRGF2ZS5vZmYoJ2ludmFsaWRhdGVUcmFuc2l0aW9uJywgdGhpcy5vbkRhdmVJbnZhbGlkYXRlVHJhbnNpdGlvbik7XG4gICAgICBvbGREYXZlLmRlc3Ryb3koKTtcbiAgICB9XG5cbiAgICBjb25zdCBvbGRTdGF0ZSA9IHRoaXMuX3N0YXRlO1xuICAgIHRoaXMuX3N0YXRlID0gbmV3U3RhdGU7XG4gICAgdGhpcy5lbWl0KCdzdGF0ZUNoYW5nZScsIG9sZFN0YXRlLCBuZXdTdGF0ZSk7XG5cbiAgICB0aGlzLmRlYnVnPy4oXG4gICAgICBgc3RhdGUgY2hhbmdlOlxcbmZyb20gJHtzdHJpbmdpZnlTdGF0ZShvbGRTdGF0ZSl9XFxudG8gJHtzdHJpbmdpZnlTdGF0ZShcbiAgICAgICAgbmV3U3RhdGVcbiAgICAgICl9YFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBXZWJTb2NrZXQgdG8gYSBEaXNjb3JkIFZvaWNlIGdhdGV3YXkuXG4gICAqXG4gICAqIEBwYXJhbSBlbmRwb2ludCAtIFRoZSBlbmRwb2ludCB0byBjb25uZWN0IHRvXG4gICAqIEBwYXJhbSBsYXN0U2VxdWVuY2UgLSBUaGUgbGFzdCBzZXF1ZW5jZSB0byBzZXQgZm9yIHRoaXMgV2ViU29ja2V0XG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZVdlYlNvY2tldChlbmRwb2ludDogc3RyaW5nLCBsYXN0U2VxdWVuY2U/OiBudW1iZXIpIHtcbiAgICBjb25zdCB3cyA9IG5ldyBWb2ljZVdlYlNvY2tldChgd3NzOi8vJHtlbmRwb2ludH0/dj04YCwgQm9vbGVhbih0aGlzLmRlYnVnKSk7XG5cbiAgICBpZiAobGFzdFNlcXVlbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHdzLnNlcXVlbmNlID0gbGFzdFNlcXVlbmNlO1xuICAgIH1cblxuICAgIHdzLm9uKCdlcnJvcicsIHRoaXMub25DaGlsZEVycm9yKTtcbiAgICB3cy5vbmNlKCdvcGVuJywgdGhpcy5vbldzT3Blbik7XG4gICAgd3Mub24oJ3BhY2tldCcsIHRoaXMub25Xc1BhY2tldCk7XG4gICAgd3Mub24oJ2JpbmFyeScsIHRoaXMub25Xc0JpbmFyeSk7XG4gICAgd3Mub25jZSgnY2xvc2UnLCB0aGlzLm9uV3NDbG9zZSk7XG4gICAgd3Mub24oJ2RlYnVnJywgdGhpcy5vbldzRGVidWcpO1xuXG4gICAgcmV0dXJuIHdzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgREFWRSBzZXNzaW9uIGZvciB0aGlzIHZvaWNlIGNvbm5lY3Rpb24gaWYgd2UgY2FuIGNyZWF0ZSBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSBwcm90b2NvbFZlcnNpb24gLSBUaGUgcHJvdG9jb2wgdmVyc2lvbiB0byB1c2VcbiAgICovXG4gIHByaXZhdGUgY3JlYXRlRGF2ZVNlc3Npb24ocHJvdG9jb2xWZXJzaW9uOiBudW1iZXIpIHtcbiAgICBpZiAoXG4gICAgdGhpcy5vcHRpb25zLmRhdmVFbmNyeXB0aW9uID09PSBmYWxzZSB8fFxuICAgIHRoaXMuc3RhdGUuY29kZSAhPT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuU2VsZWN0aW5nUHJvdG9jb2wgJiZcbiAgICB0aGlzLnN0YXRlLmNvZGUgIT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5ICYmXG4gICAgdGhpcy5zdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZXN1bWluZylcbiAgICB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2Vzc2lvbiA9IG5ldyBEQVZFU2Vzc2lvbihcbiAgICAgIHByb3RvY29sVmVyc2lvbixcbiAgICAgIHRoaXMuc3RhdGUuY29ubmVjdGlvbk9wdGlvbnMudXNlcklkLFxuICAgICAgdGhpcy5zdGF0ZS5jb25uZWN0aW9uT3B0aW9ucy5jaGFubmVsSWQsXG4gICAgICB7XG4gICAgICAgIGRlY3J5cHRpb25GYWlsdXJlVG9sZXJhbmNlOiB0aGlzLm9wdGlvbnMuZGVjcnlwdGlvbkZhaWx1cmVUb2xlcmFuY2VcbiAgICAgIH1cbiAgICApO1xuXG4gICAgc2Vzc2lvbi5vbignZXJyb3InLCB0aGlzLm9uQ2hpbGRFcnJvcik7XG4gICAgc2Vzc2lvbi5vbignZGVidWcnLCB0aGlzLm9uRGF2ZURlYnVnKTtcbiAgICBzZXNzaW9uLm9uKCdrZXlQYWNrYWdlJywgdGhpcy5vbkRhdmVLZXlQYWNrYWdlKTtcbiAgICBzZXNzaW9uLm9uKCdpbnZhbGlkYXRlVHJhbnNpdGlvbicsIHRoaXMub25EYXZlSW52YWxpZGF0ZVRyYW5zaXRpb24pO1xuICAgIHNlc3Npb24ucmVpbml0KCk7XG5cbiAgICByZXR1cm4gc2Vzc2lvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9wYWdhdGVzIGVycm9ycyBmcm9tIHRoZSBjaGlsZHJlbiBWb2ljZVdlYlNvY2tldCwgVm9pY2VVRFBTb2NrZXQgYW5kIERBVkVTZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhhdCB3YXMgZW1pdHRlZCBieSBhIGNoaWxkXG4gICAqL1xuICBwcml2YXRlIG9uQ2hpbGRFcnJvcihlcnJvcjogRXJyb3IpIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSBXZWJTb2NrZXQgb3BlbnMuIERlcGVuZGluZyBvbiB0aGUgc3RhdGUgdGhhdCB0aGUgaW5zdGFuY2UgaXMgaW4sXG4gICAqIGl0IHdpbGwgZWl0aGVyIGlkZW50aWZ5IHdpdGggYSBuZXcgc2Vzc2lvbiwgb3IgaXQgd2lsbCBhdHRlbXB0IHRvIHJlc3VtZSBhbiBleGlzdGluZyBzZXNzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBvbldzT3BlbigpIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5PcGVuaW5nV3MpIHtcbiAgICAgIHRoaXMuc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICAgIG9wOiBWb2ljZU9wY29kZXMuSWRlbnRpZnksXG4gICAgICAgIGQ6IHtcbiAgICAgICAgICBzZXJ2ZXJfaWQ6IHRoaXMuc3RhdGUuY29ubmVjdGlvbk9wdGlvbnMuc2VydmVySWQsXG4gICAgICAgICAgdXNlcl9pZDogdGhpcy5zdGF0ZS5jb25uZWN0aW9uT3B0aW9ucy51c2VySWQsXG4gICAgICAgICAgc2Vzc2lvbl9pZDogdGhpcy5zdGF0ZS5jb25uZWN0aW9uT3B0aW9ucy5zZXNzaW9uSWQsXG4gICAgICAgICAgdG9rZW46IHRoaXMuc3RhdGUuY29ubmVjdGlvbk9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgbWF4X2RhdmVfcHJvdG9jb2xfdmVyc2lvbjpcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZGF2ZUVuY3J5cHRpb24gPT09IGZhbHNlID8gMCA6IGdldE1heFByb3RvY29sVmVyc2lvbigpXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgY29kZTogTmV0d29ya2luZ1N0YXR1c0NvZGUuSWRlbnRpZnlpbmdcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlc3VtaW5nKSB7XG4gICAgICB0aGlzLnN0YXRlLndzLnNlbmRQYWNrZXQoe1xuICAgICAgICBvcDogVm9pY2VPcGNvZGVzLlJlc3VtZSxcbiAgICAgICAgZDoge1xuICAgICAgICAgIHNlcnZlcl9pZDogdGhpcy5zdGF0ZS5jb25uZWN0aW9uT3B0aW9ucy5zZXJ2ZXJJZCxcbiAgICAgICAgICBzZXNzaW9uX2lkOiB0aGlzLnN0YXRlLmNvbm5lY3Rpb25PcHRpb25zLnNlc3Npb25JZCxcbiAgICAgICAgICB0b2tlbjogdGhpcy5zdGF0ZS5jb25uZWN0aW9uT3B0aW9ucy50b2tlbixcbiAgICAgICAgICBzZXFfYWNrOiB0aGlzLnN0YXRlLndzLnNlcXVlbmNlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNsb3Nlcy4gQmFzZWQgb24gdGhlIHJlYXNvbiBmb3IgY2xvc2luZyAoZ2l2ZW4gYnkgdGhlIGNvZGUgcGFyYW1ldGVyKSxcbiAgICogdGhlIGluc3RhbmNlIHdpbGwgZWl0aGVyIGF0dGVtcHQgdG8gcmVzdW1lLCBvciBlbnRlciB0aGUgY2xvc2VkIHN0YXRlIGFuZCBlbWl0IGEgJ2Nsb3NlJyBldmVudFxuICAgKiB3aXRoIHRoZSBjbG9zZSBjb2RlLCBhbGxvd2luZyB0aGUgdXNlciB0byBkZWNpZGUgd2hldGhlciBvciBub3QgdGhleSB3b3VsZCBsaWtlIHRvIHJlY29ubmVjdC5cbiAgICpcbiAgICogQHBhcmFtIGNvZGUgLSBUaGUgY2xvc2UgY29kZVxuICAgKi9cbiAgcHJpdmF0ZSBvbldzQ2xvc2UoeyBjb2RlIH06IENsb3NlRXZlbnQpIHtcbiAgICBjb25zdCBjYW5SZXN1bWUgPSBjb2RlID09PSA0XzAxNSB8fCBjb2RlIDwgNF8wMDA7XG4gICAgaWYgKGNhblJlc3VtZSAmJiB0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5KSB7XG4gICAgICBjb25zdCBsYXN0U2VxdWVuY2UgPSB0aGlzLnN0YXRlLndzLnNlcXVlbmNlO1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgICAgY29kZTogTmV0d29ya2luZ1N0YXR1c0NvZGUuUmVzdW1pbmcsXG4gICAgICAgIHdzOiB0aGlzLmNyZWF0ZVdlYlNvY2tldChcbiAgICAgICAgICB0aGlzLnN0YXRlLmNvbm5lY3Rpb25PcHRpb25zLmVuZHBvaW50LFxuICAgICAgICAgIGxhc3RTZXF1ZW5jZVxuICAgICAgICApXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5DbG9zZWQpIHtcbiAgICAgIHRoaXMuZGVzdHJveSgpO1xuICAgICAgdGhpcy5lbWl0KCdjbG9zZScsIGNvZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgVURQIHNvY2tldCBoYXMgY2xvc2VkIGl0c2VsZiBpZiBpdCBoYXMgc3RvcHBlZCByZWNlaXZpbmcgcmVwbGllcyBmcm9tIERpc2NvcmQuXG4gICAqL1xuICBwcml2YXRlIG9uVWRwQ2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuUmVhZHkpIHtcbiAgICAgIGNvbnN0IGxhc3RTZXF1ZW5jZSA9IHRoaXMuc3RhdGUud3Muc2VxdWVuY2U7XG4gICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAuLi50aGlzLnN0YXRlLFxuICAgICAgICBjb2RlOiBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZXN1bWluZyxcbiAgICAgICAgd3M6IHRoaXMuY3JlYXRlV2ViU29ja2V0KFxuICAgICAgICAgIHRoaXMuc3RhdGUuY29ubmVjdGlvbk9wdGlvbnMuZW5kcG9pbnQsXG4gICAgICAgICAgbGFzdFNlcXVlbmNlXG4gICAgICAgIClcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIGEgcGFja2V0IGlzIHJlY2VpdmVkIG9uIHRoZSBjb25uZWN0aW9uJ3MgV2ViU29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0gcGFja2V0IC0gVGhlIHJlY2VpdmVkIHBhY2tldFxuICAgKi9cbiAgcHJpdmF0ZSBvbldzUGFja2V0KHBhY2tldDogVm9pY2VSZWNlaXZlUGF5bG9hZCkge1xuICAgIGlmIChcbiAgICBwYWNrZXQub3AgPT09IFZvaWNlT3Bjb2Rlcy5IZWxsbyAmJlxuICAgIHRoaXMuc3RhdGUuY29kZSAhPT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuQ2xvc2VkKVxuICAgIHtcbiAgICAgIHRoaXMuc3RhdGUud3Muc2V0SGVhcnRiZWF0SW50ZXJ2YWwocGFja2V0LmQuaGVhcnRiZWF0X2ludGVydmFsKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgIHBhY2tldC5vcCA9PT0gVm9pY2VPcGNvZGVzLlJlYWR5ICYmXG4gICAgdGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5JZGVudGlmeWluZylcbiAgICB7XG4gICAgICBjb25zdCB7IGlwLCBwb3J0LCBzc3JjLCBtb2RlcyB9ID0gcGFja2V0LmQ7XG5cbiAgICAgIGNvbnN0IHVkcCA9IG5ldyBWb2ljZVVEUFNvY2tldCh7IGlwLCBwb3J0IH0pO1xuICAgICAgdWRwLm9uKCdlcnJvcicsIHRoaXMub25DaGlsZEVycm9yKTtcbiAgICAgIHVkcC5vbignZGVidWcnLCB0aGlzLm9uVWRwRGVidWcpO1xuICAgICAgdWRwLm9uY2UoJ2Nsb3NlJywgdGhpcy5vblVkcENsb3NlKTtcbiAgICAgIHVkcC5cbiAgICAgIHBlcmZvcm1JUERpc2NvdmVyeShzc3JjKS5cbiAgICAgIHRoZW4oKGxvY2FsQ29uZmlnKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmNvZGUgIT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlVkcEhhbmRzaGFraW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICAgICAgb3A6IFZvaWNlT3Bjb2Rlcy5TZWxlY3RQcm90b2NvbCxcbiAgICAgICAgICBkOiB7XG4gICAgICAgICAgICBwcm90b2NvbDogJ3VkcCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIGFkZHJlc3M6IGxvY2FsQ29uZmlnLmlwLFxuICAgICAgICAgICAgICBwb3J0OiBsb2NhbENvbmZpZy5wb3J0LFxuICAgICAgICAgICAgICBtb2RlOiBjaG9vc2VFbmNyeXB0aW9uTW9kZShtb2RlcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnRoaXMuc3RhdGUsXG4gICAgICAgICAgY29kZTogTmV0d29ya2luZ1N0YXR1c0NvZGUuU2VsZWN0aW5nUHJvdG9jb2xcbiAgICAgICAgfTtcbiAgICAgIH0pLlxuICAgICAgY2F0Y2goKGVycm9yOiBFcnJvcikgPT4gdGhpcy5lbWl0KCdlcnJvcicsIGVycm9yKSk7XG5cbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIC4uLnRoaXMuc3RhdGUsXG4gICAgICAgIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlVkcEhhbmRzaGFraW5nLFxuICAgICAgICB1ZHAsXG4gICAgICAgIGNvbm5lY3Rpb25EYXRhOiB7XG4gICAgICAgICAgc3NyYyxcbiAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzOiBuZXcgU2V0KClcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKFxuICAgIHBhY2tldC5vcCA9PT0gVm9pY2VPcGNvZGVzLlNlc3Npb25EZXNjcmlwdGlvbiAmJlxuICAgIHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuU2VsZWN0aW5nUHJvdG9jb2wpXG4gICAge1xuICAgICAgY29uc3Qge1xuICAgICAgICBtb2RlOiBlbmNyeXB0aW9uTW9kZSxcbiAgICAgICAgc2VjcmV0X2tleTogc2VjcmV0S2V5LFxuICAgICAgICBkYXZlX3Byb3RvY29sX3ZlcnNpb246IGRhdmVQcm90b2NvbFZlcnNpb25cbiAgICAgIH0gPSBwYWNrZXQuZDtcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIC4uLnRoaXMuc3RhdGUsXG4gICAgICAgIGNvZGU6IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5LFxuICAgICAgICBkYXZlOiB0aGlzLmNyZWF0ZURhdmVTZXNzaW9uKGRhdmVQcm90b2NvbFZlcnNpb24pLFxuICAgICAgICBjb25uZWN0aW9uRGF0YToge1xuICAgICAgICAgIC4uLnRoaXMuc3RhdGUuY29ubmVjdGlvbkRhdGEsXG4gICAgICAgICAgZW5jcnlwdGlvbk1vZGUsXG4gICAgICAgICAgc2VjcmV0S2V5OiBuZXcgVWludDhBcnJheShzZWNyZXRLZXkpLFxuICAgICAgICAgIHNlcXVlbmNlOiByYW5kb21OQml0KDE2KSxcbiAgICAgICAgICB0aW1lc3RhbXA6IHJhbmRvbU5CaXQoMzIpLFxuICAgICAgICAgIG5vbmNlOiAwLFxuICAgICAgICAgIG5vbmNlQnVmZmVyOlxuICAgICAgICAgIGVuY3J5cHRpb25Nb2RlID09PSAnYWVhZF9hZXMyNTZfZ2NtX3J0cHNpemUnID9cbiAgICAgICAgICBCdWZmZXIuYWxsb2MoMTIpIDpcbiAgICAgICAgICBCdWZmZXIuYWxsb2MoMjQpLFxuICAgICAgICAgIHNwZWFraW5nOiBmYWxzZSxcbiAgICAgICAgICBwYWNrZXRzUGxheWVkOiAwXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChcbiAgICBwYWNrZXQub3AgPT09IFZvaWNlT3Bjb2Rlcy5SZXN1bWVkICYmXG4gICAgdGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZXN1bWluZylcbiAgICB7XG4gICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAuLi50aGlzLnN0YXRlLFxuICAgICAgICBjb2RlOiBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeVxuICAgICAgfTtcbiAgICAgIHRoaXMuc3RhdGUuY29ubmVjdGlvbkRhdGEuc3BlYWtpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgIChwYWNrZXQub3AgPT09IFZvaWNlT3Bjb2Rlcy5DbGllbnRzQ29ubmVjdCB8fFxuICAgIHBhY2tldC5vcCA9PT0gVm9pY2VPcGNvZGVzLkNsaWVudERpc2Nvbm5lY3QpICYmIChcbiAgICB0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5IHx8XG4gICAgdGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5VZHBIYW5kc2hha2luZyB8fFxuICAgIHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuU2VsZWN0aW5nUHJvdG9jb2wgfHxcbiAgICB0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlc3VtaW5nKSlcbiAgICB7XG4gICAgICBjb25zdCB7IGNvbm5lY3Rpb25EYXRhIH0gPSB0aGlzLnN0YXRlO1xuICAgICAgaWYgKHBhY2tldC5vcCA9PT0gVm9pY2VPcGNvZGVzLkNsaWVudHNDb25uZWN0KVxuICAgICAgZm9yIChjb25zdCBpZCBvZiBwYWNrZXQuZC51c2VyX2lkcylcbiAgICAgIGNvbm5lY3Rpb25EYXRhLmNvbm5lY3RlZENsaWVudHMuYWRkKGlkKTtlbHNlXG4gICAgICB7XG4gICAgICAgIGNvbm5lY3Rpb25EYXRhLmNvbm5lY3RlZENsaWVudHMuZGVsZXRlKHBhY2tldC5kLnVzZXJfaWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgKHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuUmVhZHkgfHxcbiAgICB0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlc3VtaW5nKSAmJlxuICAgIHRoaXMuc3RhdGUuZGF2ZSlcbiAgICB7XG4gICAgICBpZiAocGFja2V0Lm9wID09PSBWb2ljZU9wY29kZXMuRGF2ZVByZXBhcmVUcmFuc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IHNlbmRSZWFkeSA9IHRoaXMuc3RhdGUuZGF2ZS5wcmVwYXJlVHJhbnNpdGlvbihwYWNrZXQuZCk7XG4gICAgICAgIGlmIChzZW5kUmVhZHkpXG4gICAgICAgIHRoaXMuc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICAgICAgb3A6IFZvaWNlT3Bjb2Rlcy5EYXZlVHJhbnNpdGlvblJlYWR5LFxuICAgICAgICAgIGQ6IHsgdHJhbnNpdGlvbl9pZDogcGFja2V0LmQudHJhbnNpdGlvbl9pZCB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocGFja2V0LmQudHJhbnNpdGlvbl9pZCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuZW1pdCgndHJhbnNpdGlvbmVkJywgMCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocGFja2V0Lm9wID09PSBWb2ljZU9wY29kZXMuRGF2ZUV4ZWN1dGVUcmFuc2l0aW9uKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb25lZCA9IHRoaXMuc3RhdGUuZGF2ZS5leGVjdXRlVHJhbnNpdGlvbihcbiAgICAgICAgICBwYWNrZXQuZC50cmFuc2l0aW9uX2lkXG4gICAgICAgICk7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uZWQpIHRoaXMuZW1pdCgndHJhbnNpdGlvbmVkJywgcGFja2V0LmQudHJhbnNpdGlvbl9pZCk7XG4gICAgICB9IGVsc2UgaWYgKHBhY2tldC5vcCA9PT0gVm9pY2VPcGNvZGVzLkRhdmVQcmVwYXJlRXBvY2gpXG4gICAgICB0aGlzLnN0YXRlLmRhdmUucHJlcGFyZUVwb2NoKHBhY2tldC5kKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gYSBiaW5hcnkgbWVzc2FnZSBpcyByZWNlaXZlZCBvbiB0aGUgY29ubmVjdGlvbidzIFdlYlNvY2tldC5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgcmVjZWl2ZWQgbWVzc2FnZVxuICAgKi9cbiAgcHJpdmF0ZSBvbldzQmluYXJ5KG1lc3NhZ2U6IEJpbmFyeVdlYlNvY2tldE1lc3NhZ2UpIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSAmJiB0aGlzLnN0YXRlLmRhdmUpIHtcbiAgICAgIGlmIChtZXNzYWdlLm9wID09PSBWb2ljZU9wY29kZXMuRGF2ZU1sc0V4dGVybmFsU2VuZGVyKSB7XG4gICAgICAgIHRoaXMuc3RhdGUuZGF2ZS5zZXRFeHRlcm5hbFNlbmRlcihtZXNzYWdlLnBheWxvYWQpO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm9wID09PSBWb2ljZU9wY29kZXMuRGF2ZU1sc1Byb3Bvc2Fscykge1xuICAgICAgICBjb25zdCBwYXlsb2FkID0gdGhpcy5zdGF0ZS5kYXZlLnByb2Nlc3NQcm9wb3NhbHMoXG4gICAgICAgICAgbWVzc2FnZS5wYXlsb2FkLFxuICAgICAgICAgIHRoaXMuc3RhdGUuY29ubmVjdGlvbkRhdGEuY29ubmVjdGVkQ2xpZW50c1xuICAgICAgICApO1xuICAgICAgICBpZiAocGF5bG9hZClcbiAgICAgICAgdGhpcy5zdGF0ZS53cy5zZW5kQmluYXJ5TWVzc2FnZShcbiAgICAgICAgICBWb2ljZU9wY29kZXMuRGF2ZU1sc0NvbW1pdFdlbGNvbWUsXG4gICAgICAgICAgcGF5bG9hZFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLm9wID09PSBWb2ljZU9wY29kZXMuRGF2ZU1sc0Fubm91bmNlQ29tbWl0VHJhbnNpdGlvbikge1xuICAgICAgICBjb25zdCB7IHRyYW5zaXRpb25JZCwgc3VjY2VzcyB9ID0gdGhpcy5zdGF0ZS5kYXZlLnByb2Nlc3NDb21taXQoXG4gICAgICAgICAgbWVzc2FnZS5wYXlsb2FkXG4gICAgICAgICk7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgaWYgKHRyYW5zaXRpb25JZCA9PT0gMCkgdGhpcy5lbWl0KCd0cmFuc2l0aW9uZWQnLCB0cmFuc2l0aW9uSWQpO2Vsc2VcblxuICAgICAgICAgIHRoaXMuc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICAgICAgICBvcDogVm9pY2VPcGNvZGVzLkRhdmVUcmFuc2l0aW9uUmVhZHksXG4gICAgICAgICAgICBkOiB7IHRyYW5zaXRpb25faWQ6IHRyYW5zaXRpb25JZCB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5vcCA9PT0gVm9pY2VPcGNvZGVzLkRhdmVNbHNXZWxjb21lKSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNpdGlvbklkLCBzdWNjZXNzIH0gPSB0aGlzLnN0YXRlLmRhdmUucHJvY2Vzc1dlbGNvbWUoXG4gICAgICAgICAgbWVzc2FnZS5wYXlsb2FkXG4gICAgICAgICk7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgaWYgKHRyYW5zaXRpb25JZCA9PT0gMCkgdGhpcy5lbWl0KCd0cmFuc2l0aW9uZWQnLCB0cmFuc2l0aW9uSWQpO2Vsc2VcblxuICAgICAgICAgIHRoaXMuc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICAgICAgICBvcDogVm9pY2VPcGNvZGVzLkRhdmVUcmFuc2l0aW9uUmVhZHksXG4gICAgICAgICAgICBkOiB7IHRyYW5zaXRpb25faWQ6IHRyYW5zaXRpb25JZCB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gYSBuZXcga2V5IHBhY2thZ2UgaXMgcmVhZHkgdG8gYmUgc2VudCB0byB0aGUgdm9pY2Ugc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ga2V5UGFja2FnZSAtIFRoZSBuZXcga2V5IHBhY2thZ2VcbiAgICovXG4gIHByaXZhdGUgb25EYXZlS2V5UGFja2FnZShrZXlQYWNrYWdlOiBCdWZmZXIpIHtcbiAgICBpZiAoXG4gICAgdGhpcy5zdGF0ZS5jb2RlID09PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5TZWxlY3RpbmdQcm90b2NvbCB8fFxuICAgIHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuUmVhZHkpXG5cbiAgICB0aGlzLnN0YXRlLndzLnNlbmRCaW5hcnlNZXNzYWdlKFxuICAgICAgVm9pY2VPcGNvZGVzLkRhdmVNbHNLZXlQYWNrYWdlLFxuICAgICAga2V5UGFja2FnZVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gdGhlIERBVkUgc2Vzc2lvbiB3YW50cyB0byBpbnZhbGlkYXRlIHRoZWlyIHRyYW5zaXRpb24gYW5kIHJlLWluaXRpYWxpemUuXG4gICAqXG4gICAqIEBwYXJhbSB0cmFuc2l0aW9uSWQgLSBUaGUgdHJhbnNpdGlvbiB0byBpbnZhbGlkYXRlXG4gICAqL1xuICBwcml2YXRlIG9uRGF2ZUludmFsaWRhdGVUcmFuc2l0aW9uKHRyYW5zaXRpb25JZDogbnVtYmVyKSB7XG4gICAgaWYgKFxuICAgIHRoaXMuc3RhdGUuY29kZSA9PT0gTmV0d29ya2luZ1N0YXR1c0NvZGUuU2VsZWN0aW5nUHJvdG9jb2wgfHxcbiAgICB0aGlzLnN0YXRlLmNvZGUgPT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5KVxuXG4gICAgdGhpcy5zdGF0ZS53cy5zZW5kUGFja2V0KHtcbiAgICAgIG9wOiBWb2ljZU9wY29kZXMuRGF2ZU1sc0ludmFsaWRDb21taXRXZWxjb21lLFxuICAgICAgZDogeyB0cmFuc2l0aW9uX2lkOiB0cmFuc2l0aW9uSWQgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgZGVidWcgbWVzc2FnZXMgZnJvbSB0aGUgY2hpbGQgV2ViU29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlbWl0dGVkIGRlYnVnIG1lc3NhZ2VcbiAgICovXG4gIHByaXZhdGUgb25Xc0RlYnVnKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHRoaXMuZGVidWc/LihgW1dTXSAke21lc3NhZ2V9YCk7XG4gIH1cblxuICAvKipcbiAgICogUHJvcGFnYXRlcyBkZWJ1ZyBtZXNzYWdlcyBmcm9tIHRoZSBjaGlsZCBVRFBTb2NrZXQuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGVtaXR0ZWQgZGVidWcgbWVzc2FnZVxuICAgKi9cbiAgcHJpdmF0ZSBvblVkcERlYnVnKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHRoaXMuZGVidWc/LihgW1VEUF0gJHttZXNzYWdlfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb3BhZ2F0ZXMgZGVidWcgbWVzc2FnZXMgZnJvbSB0aGUgY2hpbGQgREFWRVNlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGVtaXR0ZWQgZGVidWcgbWVzc2FnZVxuICAgKi9cbiAgcHJpdmF0ZSBvbkRhdmVEZWJ1ZyhtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICB0aGlzLmRlYnVnPy4oYFtEQVZFXSAke21lc3NhZ2V9YCk7XG4gIH1cblxuICAvKipcbiAgICogUHJlcGFyZXMgYW4gT3B1cyBwYWNrZXQgZm9yIHBsYXliYWNrLiBUaGlzIGluY2x1ZGVzIGF0dGFjaGluZyBtZXRhZGF0YSB0byBpdCBhbmQgZW5jcnlwdGluZyBpdC5cbiAgICogSXQgd2lsbCBiZSBzdG9yZWQgd2l0aGluIHRoZSBpbnN0YW5jZSwgYW5kIGNhbiBiZSBwbGF5ZWQgYnkgZGlzcGF0Y2hBdWRpbygpXG4gICAqXG4gICAqIEByZW1hcmtzXG4gICAqIENhbGxpbmcgdGhpcyBtZXRob2Qgd2hpbGUgdGhlcmUgaXMgYWxyZWFkeSBhIHByZXBhcmVkIGF1ZGlvIHBhY2tldCB0aGF0IGhhcyBub3QgeWV0IGJlZW4gZGlzcGF0Y2hlZFxuICAgKiB3aWxsIG92ZXJ3cml0ZSB0aGUgZXhpc3RpbmcgYXVkaW8gcGFja2V0LiBUaGlzIHNob3VsZCBiZSBhdm9pZGVkLlxuICAgKiBAcGFyYW0gb3B1c1BhY2tldCAtIFRoZSBPcHVzIHBhY2tldCB0byBlbmNyeXB0XG4gICAqIEByZXR1cm5zIFRoZSBhdWRpbyBwYWNrZXQgdGhhdCB3YXMgcHJlcGFyZWRcbiAgICovXG4gIHB1YmxpYyBwcmVwYXJlQXVkaW9QYWNrZXQob3B1c1BhY2tldDogQnVmZmVyKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgIGlmIChzdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSkgcmV0dXJuO1xuICAgIHN0YXRlLnByZXBhcmVkUGFja2V0ID0gdGhpcy5jcmVhdGVBdWRpb1BhY2tldChcbiAgICAgIG9wdXNQYWNrZXQsXG4gICAgICBzdGF0ZS5jb25uZWN0aW9uRGF0YSxcbiAgICAgIHN0YXRlLmRhdmVcbiAgICApO1xuICAgIHJldHVybiBzdGF0ZS5wcmVwYXJlZFBhY2tldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIHRoZSBhdWRpbyBwYWNrZXQgcHJldmlvdXNseSBwcmVwYXJlZCBieSBwcmVwYXJlQXVkaW9QYWNrZXQob3B1c1BhY2tldCkuIFRoZSBhdWRpbyBwYWNrZXRcbiAgICogaXMgY29uc3VtZWQgYW5kIGNhbm5vdCBiZSBkaXNwYXRjaGVkIGFnYWluLlxuICAgKi9cbiAgcHVibGljIGRpc3BhdGNoQXVkaW8oKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgIGlmIChzdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChzdGF0ZS5wcmVwYXJlZFBhY2tldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBsYXlBdWRpb1BhY2tldChzdGF0ZS5wcmVwYXJlZFBhY2tldCk7XG4gICAgICBzdGF0ZS5wcmVwYXJlZFBhY2tldCA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQbGF5cyBhbiBhdWRpbyBwYWNrZXQsIHVwZGF0aW5nIHRpbWluZyBtZXRhZGF0YSB1c2VkIGZvciBwbGF5YmFjay5cbiAgICpcbiAgICogQHBhcmFtIGF1ZGlvUGFja2V0IC0gVGhlIGF1ZGlvIHBhY2tldCB0byBwbGF5XG4gICAqL1xuICBwcml2YXRlIHBsYXlBdWRpb1BhY2tldChhdWRpb1BhY2tldDogQnVmZmVyKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnN0YXRlO1xuICAgIGlmIChzdGF0ZS5jb2RlICE9PSBOZXR3b3JraW5nU3RhdHVzQ29kZS5SZWFkeSkgcmV0dXJuO1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbkRhdGEgfSA9IHN0YXRlO1xuICAgIGNvbm5lY3Rpb25EYXRhLnBhY2tldHNQbGF5ZWQrKztcbiAgICBjb25uZWN0aW9uRGF0YS5zZXF1ZW5jZSsrO1xuICAgIGNvbm5lY3Rpb25EYXRhLnRpbWVzdGFtcCArPSBUSU1FU1RBTVBfSU5DO1xuICAgIGlmIChjb25uZWN0aW9uRGF0YS5zZXF1ZW5jZSA+PSAyICoqIDE2KSBjb25uZWN0aW9uRGF0YS5zZXF1ZW5jZSA9IDA7XG4gICAgaWYgKGNvbm5lY3Rpb25EYXRhLnRpbWVzdGFtcCA+PSAyICoqIDMyKSBjb25uZWN0aW9uRGF0YS50aW1lc3RhbXAgPSAwO1xuICAgIHRoaXMuc2V0U3BlYWtpbmcodHJ1ZSk7XG4gICAgc3RhdGUudWRwLnNlbmQoYXVkaW9QYWNrZXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgcGFja2V0IHRvIHRoZSB2b2ljZSBnYXRld2F5IGluZGljYXRpbmcgdGhhdCB0aGUgY2xpZW50IGhhcyBzdGFydC9zdG9wcGVkIHNlbmRpbmdcbiAgICogYXVkaW8uXG4gICAqXG4gICAqIEBwYXJhbSBzcGVha2luZyAtIFdoZXRoZXIgb3Igbm90IHRoZSBjbGllbnQgc2hvdWxkIGJlIHNob3duIGFzIHNwZWFraW5nXG4gICAqL1xuICBwdWJsaWMgc2V0U3BlYWtpbmcoc3BlYWtpbmc6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgaWYgKHN0YXRlLmNvZGUgIT09IE5ldHdvcmtpbmdTdGF0dXNDb2RlLlJlYWR5KSByZXR1cm47XG4gICAgaWYgKHN0YXRlLmNvbm5lY3Rpb25EYXRhLnNwZWFraW5nID09PSBzcGVha2luZykgcmV0dXJuO1xuICAgIHN0YXRlLmNvbm5lY3Rpb25EYXRhLnNwZWFraW5nID0gc3BlYWtpbmc7XG4gICAgc3RhdGUud3Muc2VuZFBhY2tldCh7XG4gICAgICBvcDogVm9pY2VPcGNvZGVzLlNwZWFraW5nLFxuICAgICAgZDoge1xuICAgICAgICBzcGVha2luZzogKHNwZWFraW5nID8gMSA6IDApIGFzIFZvaWNlU3BlYWtpbmdGbGFncyxcbiAgICAgICAgZGVsYXk6IDAsXG4gICAgICAgIHNzcmM6IHN0YXRlLmNvbm5lY3Rpb25EYXRhLnNzcmNcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGF1ZGlvIHBhY2tldCBmcm9tIGFuIE9wdXMgcGFja2V0LiBUaGlzIGludm9sdmVzIGVuY3J5cHRpbmcgdGhlIHBhY2tldCxcbiAgICogdGhlbiBwcmVwZW5kaW5nIGEgaGVhZGVyIHRoYXQgaW5jbHVkZXMgbWV0YWRhdGEuXG4gICAqXG4gICAqIEBwYXJhbSBvcHVzUGFja2V0IC0gVGhlIE9wdXMgcGFja2V0IHRvIHByZXBhcmVcbiAgICogQHBhcmFtIGNvbm5lY3Rpb25EYXRhIC0gVGhlIGN1cnJlbnQgY29ubmVjdGlvbiBkYXRhIG9mIHRoZSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gZGF2ZVNlc3Npb24gLSBUaGUgREFWRSBzZXNzaW9uIHRvIHVzZSBmb3IgZW5jcnlwdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVBdWRpb1BhY2tldChcbiAgb3B1c1BhY2tldDogQnVmZmVyLFxuICBjb25uZWN0aW9uRGF0YTogQ29ubmVjdGlvbkRhdGEsXG4gIGRhdmVTZXNzaW9uPzogREFWRVNlc3Npb24pXG4gIHtcbiAgICBjb25zdCBydHBIZWFkZXIgPSBCdWZmZXIuYWxsb2MoMTIpO1xuICAgIHJ0cEhlYWRlclswXSA9IDB4ODA7XG4gICAgcnRwSGVhZGVyWzFdID0gMHg3ODtcblxuICAgIGNvbnN0IHsgc2VxdWVuY2UsIHRpbWVzdGFtcCwgc3NyYyB9ID0gY29ubmVjdGlvbkRhdGE7XG5cbiAgICBydHBIZWFkZXIud3JpdGVVSW50QkUoc2VxdWVuY2UsIDIsIDIpO1xuICAgIHJ0cEhlYWRlci53cml0ZVVJbnRCRSh0aW1lc3RhbXAsIDQsIDQpO1xuICAgIHJ0cEhlYWRlci53cml0ZVVJbnRCRShzc3JjLCA4LCA0KTtcblxuICAgIHJ0cEhlYWRlci5jb3B5KG5vbmNlLCAwLCAwLCAxMik7XG4gICAgcmV0dXJuIEJ1ZmZlci5jb25jYXQoW1xuICAgIHJ0cEhlYWRlcixcbiAgICAuLi50aGlzLmVuY3J5cHRPcHVzUGFja2V0KFxuICAgICAgb3B1c1BhY2tldCxcbiAgICAgIGNvbm5lY3Rpb25EYXRhLFxuICAgICAgcnRwSGVhZGVyLFxuICAgICAgZGF2ZVNlc3Npb25cbiAgICApXVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogRW5jcnlwdHMgYW4gT3B1cyBwYWNrZXQgdXNpbmcgdGhlIGZvcm1hdCBhZ3JlZWQgdXBvbiBieSB0aGUgaW5zdGFuY2UgYW5kIERpc2NvcmQuXG4gICAqXG4gICAqIEBwYXJhbSBvcHVzUGFja2V0IC0gVGhlIE9wdXMgcGFja2V0IHRvIGVuY3J5cHRcbiAgICogQHBhcmFtIGNvbm5lY3Rpb25EYXRhIC0gVGhlIGN1cnJlbnQgY29ubmVjdGlvbiBkYXRhIG9mIHRoZSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gZGF2ZVNlc3Npb24gLSBUaGUgREFWRSBzZXNzaW9uIHRvIHVzZSBmb3IgZW5jcnlwdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBlbmNyeXB0T3B1c1BhY2tldChcbiAgb3B1c1BhY2tldDogQnVmZmVyLFxuICBjb25uZWN0aW9uRGF0YTogQ29ubmVjdGlvbkRhdGEsXG4gIGFkZGl0aW9uYWxEYXRhOiBCdWZmZXIsXG4gIGRhdmVTZXNzaW9uPzogREFWRVNlc3Npb24pXG4gIHtcbiAgICBjb25zdCB7IHNlY3JldEtleSwgZW5jcnlwdGlvbk1vZGUgfSA9IGNvbm5lY3Rpb25EYXRhO1xuXG4gICAgY29uc3QgcGFja2V0ID0gZGF2ZVNlc3Npb24/LmVuY3J5cHQob3B1c1BhY2tldCkgPz8gb3B1c1BhY2tldDtcblxuICAgIC8vIEJvdGggc3VwcG9ydGVkIGVuY3J5cHRpb24gbWV0aG9kcyB3YW50IHRoZSBub25jZSB0byBiZSBhbiBpbmNyZW1lbnRhbCBpbnRlZ2VyXG4gICAgY29ubmVjdGlvbkRhdGEubm9uY2UrKztcbiAgICBpZiAoY29ubmVjdGlvbkRhdGEubm9uY2UgPiBNQVhfTk9OQ0VfU0laRSkgY29ubmVjdGlvbkRhdGEubm9uY2UgPSAwO1xuICAgIGNvbm5lY3Rpb25EYXRhLm5vbmNlQnVmZmVyLndyaXRlVUludDMyQkUoY29ubmVjdGlvbkRhdGEubm9uY2UsIDApO1xuXG4gICAgLy8gNCBleHRyYSBieXRlcyBvZiBwYWRkaW5nIG9uIHRoZSBlbmQgb2YgdGhlIGVuY3J5cHRlZCBwYWNrZXRcbiAgICBjb25zdCBub25jZVBhZGRpbmcgPSBjb25uZWN0aW9uRGF0YS5ub25jZUJ1ZmZlci5zdWJhcnJheSgwLCA0KTtcblxuICAgIGxldCBlbmNyeXB0ZWQ7XG4gICAgc3dpdGNoIChlbmNyeXB0aW9uTW9kZSkge1xuICAgICAgY2FzZSAnYWVhZF9hZXMyNTZfZ2NtX3J0cHNpemUnOntcbiAgICAgICAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoXG4gICAgICAgICAgICAnYWVzLTI1Ni1nY20nLFxuICAgICAgICAgICAgc2VjcmV0S2V5LFxuICAgICAgICAgICAgY29ubmVjdGlvbkRhdGEubm9uY2VCdWZmZXJcbiAgICAgICAgICApO1xuICAgICAgICAgIGNpcGhlci5zZXRBQUQoYWRkaXRpb25hbERhdGEpO1xuXG4gICAgICAgICAgZW5jcnlwdGVkID0gQnVmZmVyLmNvbmNhdChbXG4gICAgICAgICAgY2lwaGVyLnVwZGF0ZShwYWNrZXQpLFxuICAgICAgICAgIGNpcGhlci5maW5hbCgpLFxuICAgICAgICAgIGNpcGhlci5nZXRBdXRoVGFnKCldXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHJldHVybiBbZW5jcnlwdGVkLCBub25jZVBhZGRpbmddO1xuICAgICAgICB9XG5cbiAgICAgIGNhc2UgJ2FlYWRfeGNoYWNoYTIwX3BvbHkxMzA1X3J0cHNpemUnOntcbiAgICAgICAgICBlbmNyeXB0ZWQgPVxuICAgICAgICAgIHNlY3JldGJveC5tZXRob2RzLmNyeXB0b19hZWFkX3hjaGFjaGEyMHBvbHkxMzA1X2lldGZfZW5jcnlwdChcbiAgICAgICAgICAgIHBhY2tldCxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhLFxuICAgICAgICAgICAgY29ubmVjdGlvbkRhdGEubm9uY2VCdWZmZXIsXG4gICAgICAgICAgICBzZWNyZXRLZXkgYXMgdW5rbm93biBhcyBTaGFyZWRBcnJheUJ1ZmZlclxuICAgICAgICAgICk7XG5cbiAgICAgICAgICByZXR1cm4gW2VuY3J5cHRlZCwgbm9uY2VQYWRkaW5nXTtcbiAgICAgICAgfVxuXG4gICAgICBkZWZhdWx0OntcbiAgICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4uIE91ciBlbmNyeXB0aW9uIG1vZGUgaXMgY2hvc2VuIGZyb20gYSBsaXN0IGdpdmVuIHRvIHVzIGJ5IHRoZSBnYXRld2F5IGFuZCBjaGVja2VkIHdpdGggdGhlIG9uZXMgd2Ugc3VwcG9ydC5cbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcbiAgICAgICAgICAgIGBVbnN1cHBvcnRlZCBlbmNyeXB0aW9uIG1ldGhvZDogJHtlbmNyeXB0aW9uTW9kZX1gXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbiAgfVxufSIsICJpbXBvcnQgeyBCdWZmZXIgfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5cbmludGVyZmFjZSBNZXRob2RzIHtcbiAgY3J5cHRvX2FlYWRfeGNoYWNoYTIwcG9seTEzMDVfaWV0Zl9lbmNyeXB0KFxuICBwbGFpbnRleHQ6IEJ1ZmZlcixcbiAgYWRkaXRpb25hbERhdGE6IEJ1ZmZlcixcbiAgbm9uY2U6IEJ1ZmZlcixcbiAga2V5OiBBcnJheUJ1ZmZlckxpa2UpXG4gIDogQnVmZmVyO1xufVxuXG5jb25zdCBsaWJzID0ge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAnc29kaXVtLW5hdGl2ZSc6IChzb2RpdW06IGFueSk6IE1ldGhvZHMgPT4gKHtcbiAgICBjcnlwdG9fYWVhZF94Y2hhY2hhMjBwb2x5MTMwNV9pZXRmX2VuY3J5cHQ6IChcbiAgICBwbGFpbnRleHQ6IEJ1ZmZlcixcbiAgICBhZGRpdGlvbmFsRGF0YTogQnVmZmVyLFxuICAgIG5vbmNlOiBCdWZmZXIsXG4gICAga2V5OiBBcnJheUJ1ZmZlckxpa2UpID0+XG4gICAge1xuICAgICAgY29uc3QgY2lwaGVyVGV4dCA9IEJ1ZmZlci5hbGxvYyhcbiAgICAgICAgcGxhaW50ZXh0Lmxlbmd0aCArIHNvZGl1bS5jcnlwdG9fYWVhZF94Y2hhY2hhMjBwb2x5MTMwNV9pZXRmX0FCWVRFU1xuICAgICAgKTtcbiAgICAgIHNvZGl1bS5jcnlwdG9fYWVhZF94Y2hhY2hhMjBwb2x5MTMwNV9pZXRmX2VuY3J5cHQoXG4gICAgICAgIGNpcGhlclRleHQsXG4gICAgICAgIHBsYWludGV4dCxcbiAgICAgICAgYWRkaXRpb25hbERhdGEsXG4gICAgICAgIG51bGwsXG4gICAgICAgIG5vbmNlLFxuICAgICAgICBrZXlcbiAgICAgICk7XG4gICAgICByZXR1cm4gY2lwaGVyVGV4dDtcbiAgICB9XG4gIH0pLFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBzb2RpdW06IChzb2RpdW06IGFueSk6IE1ldGhvZHMgPT4gKHtcbiAgICBjcnlwdG9fYWVhZF94Y2hhY2hhMjBwb2x5MTMwNV9pZXRmX2VuY3J5cHQ6IChcbiAgICBwbGFpbnRleHQ6IEJ1ZmZlcixcbiAgICBhZGRpdGlvbmFsRGF0YTogQnVmZmVyLFxuICAgIG5vbmNlOiBCdWZmZXIsXG4gICAga2V5OiBBcnJheUJ1ZmZlckxpa2UpID0+XG4gICAge1xuICAgICAgcmV0dXJuIHNvZGl1bS5hcGkuY3J5cHRvX2FlYWRfeGNoYWNoYTIwcG9seTEzMDVfaWV0Zl9lbmNyeXB0KFxuICAgICAgICBwbGFpbnRleHQsXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhLFxuICAgICAgICBudWxsLFxuICAgICAgICBub25jZSxcbiAgICAgICAga2V5XG4gICAgICApO1xuICAgIH1cbiAgfSksXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICdsaWJzb2RpdW0td3JhcHBlcnMnOiAoc29kaXVtOiBhbnkpOiBNZXRob2RzID0+ICh7XG4gICAgY3J5cHRvX2FlYWRfeGNoYWNoYTIwcG9seTEzMDVfaWV0Zl9lbmNyeXB0OiAoXG4gICAgcGxhaW50ZXh0OiBCdWZmZXIsXG4gICAgYWRkaXRpb25hbERhdGE6IEJ1ZmZlcixcbiAgICBub25jZTogQnVmZmVyLFxuICAgIGtleTogQXJyYXlCdWZmZXJMaWtlKSA9PlxuICAgIHtcbiAgICAgIHJldHVybiBzb2RpdW0uY3J5cHRvX2FlYWRfeGNoYWNoYTIwcG9seTEzMDVfaWV0Zl9lbmNyeXB0KFxuICAgICAgICBwbGFpbnRleHQsXG4gICAgICAgIGFkZGl0aW9uYWxEYXRhLFxuICAgICAgICBudWxsLFxuICAgICAgICBub25jZSxcbiAgICAgICAga2V5XG4gICAgICApO1xuICAgIH1cbiAgfSksXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICdAc3RhYmxlbGliL3hjaGFjaGEyMHBvbHkxMzA1JzogKHN0YWJsZWxpYjogYW55KTogTWV0aG9kcyA9PiAoe1xuICAgIGNyeXB0b19hZWFkX3hjaGFjaGEyMHBvbHkxMzA1X2lldGZfZW5jcnlwdChcbiAgICBjaXBoZXJUZXh0LFxuICAgIGFkZGl0aW9uYWxEYXRhLFxuICAgIG5vbmNlLFxuICAgIGtleSlcbiAgICB7XG4gICAgICBjb25zdCBjcnlwdG8gPSBuZXcgc3RhYmxlbGliLlhDaGFDaGEyMFBvbHkxMzA1KGtleSk7XG4gICAgICByZXR1cm4gY3J5cHRvLnNlYWwobm9uY2UsIGNpcGhlclRleHQsIGFkZGl0aW9uYWxEYXRhKTtcbiAgICB9XG4gIH0pLFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAnQG5vYmxlL2NpcGhlcnMvY2hhY2hhJzogKG5vYmxlOiBhbnkpOiBNZXRob2RzID0+ICh7XG4gICAgY3J5cHRvX2FlYWRfeGNoYWNoYTIwcG9seTEzMDVfaWV0Zl9lbmNyeXB0KFxuICAgIHBsYWludGV4dCxcbiAgICBhZGRpdGlvbmFsRGF0YSxcbiAgICBub25jZSxcbiAgICBrZXkpXG4gICAge1xuICAgICAgY29uc3QgY2hhY2hhID0gbm9ibGUueGNoYWNoYTIwcG9seTEzMDUoa2V5LCBub25jZSwgYWRkaXRpb25hbERhdGEpO1xuICAgICAgcmV0dXJuIGNoYWNoYS5lbmNyeXB0KHBsYWludGV4dCk7XG4gICAgfVxuICB9KVxufSBhcyBjb25zdDtcblxuLy8gQHRzLWlnbm9yZVxubGlic1snc29kaXVtLWphdmFzY3JpcHQnXSA9IGxpYnNbJ3NvZGl1bS1uYXRpdmUnXTtcblxuY29uc3QgdmFsaWRMaWJzID0gT2JqZWN0LmtleXMobGlicyk7XG5cbmNvbnN0IGZhbGxiYWNrRXJyb3IgPSAoKSA9PiB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICBgQ2Fubm90IHBsYXkgYXVkaW8gYXMgbm8gdmFsaWQgZW5jcnlwdGlvbiBwYWNrYWdlIGlzIGluc3RhbGxlZC5cbi0gSW5zdGFsbCBvbmUgb2YgdGhlIGZvbGxvd2luZyBwYWNrYWdlczogJHt2YWxpZExpYnMuam9pbignLCAnKX1cbi0gVXNlIHRoZSBnZW5lcmF0ZURlcGVuZGVuY3lSZXBvcnQoKSBmdW5jdGlvbiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cXG5gXG4gICk7XG59O1xuXG5jb25zdCBtZXRob2RzOiBNZXRob2RzID0ge1xuICBjcnlwdG9fYWVhZF94Y2hhY2hhMjBwb2x5MTMwNV9pZXRmX2VuY3J5cHQ6IGZhbGxiYWNrRXJyb3Jcbn07XG5cbnZvaWQgKGFzeW5jICgpID0+IHtcbiAgZm9yIChjb25zdCBsaWJOYW1lIG9mIE9iamVjdC5rZXlzKGxpYnMpIGFzIChrZXlvZiB0eXBlb2YgbGlicylbXSkge1xuICAgIHRyeSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0cywgQHR5cGVzY3JpcHQtZXNsaW50L25vLXZhci1yZXF1aXJlc1xuICAgICAgY29uc3QgbGliID0gYXdhaXQgaW1wb3J0KGxpYk5hbWUpO1xuICAgICAgaWYgKGxpYk5hbWUgPT09ICdsaWJzb2RpdW0td3JhcHBlcnMnICYmIGxpYi5yZWFkeSkgYXdhaXQgbGliLnJlYWR5O1xuICAgICAgT2JqZWN0LmFzc2lnbihtZXRob2RzLCBsaWJzW2xpYk5hbWVdKGxpYikpO1xuICAgICAgYnJlYWs7XG4gICAgfSBjYXRjaCB7XG5cbiAgICAgIC8vXG4gICAgfX1cbn0pKCk7XG5cbmV4cG9ydCB7IG1ldGhvZHMgfTsiLCAiLy8gQ29weXJpZ2h0IGRpc2NvcmQtcGxheWVyIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBMaWNlbnNlLlxuLy8gQ29weXJpZ2h0IGRpc2NvcmQuanMgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gQXBhY2hlIExpY2Vuc2UgMi4wXG5cbmV4cG9ydCBjb25zdCBub29wID0gKCkgPT4ge307IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1kZWNsYXJhdGlvbi1tZXJnaW5nICovXG5cbmltcG9ydCB7IEJ1ZmZlciB9IGZyb20gJ25vZGU6YnVmZmVyJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ25vZGU6ZXZlbnRzJztcbmltcG9ydCB0eXBlIHtcbiAgVm9pY2VEYXZlUHJlcGFyZUVwb2NoRGF0YSxcbiAgVm9pY2VEYXZlUHJlcGFyZVRyYW5zaXRpb25EYXRhIH0gZnJvbVxuJ2Rpc2NvcmQtYXBpLXR5cGVzL3ZvaWNlL3Y4JztcbmltcG9ydCB7IFNJTEVOQ0VfRlJBTUUgfSBmcm9tICcuLi9hdWRpby9BdWRpb1BsYXllcic7XG5cbmludGVyZmFjZSBTZXNzaW9uTWV0aG9kcyB7XG4gIGNhblBhc3N0aHJvdWdoKHVzZXJJZDogc3RyaW5nKTogYm9vbGVhbjtcbiAgZGVjcnlwdCh1c2VySWQ6IHN0cmluZywgbWVkaWFUeXBlOiAwIHwgMSwgcGFja2V0OiBCdWZmZXIpOiBCdWZmZXI7XG4gIGVuY3J5cHRPcHVzKHBhY2tldDogQnVmZmVyKTogQnVmZmVyO1xuICBnZXRTZXJpYWxpemVkS2V5UGFja2FnZSgpOiBCdWZmZXI7XG4gIGdldFZlcmlmaWNhdGlvbkNvZGUodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG4gIHByb2Nlc3NDb21taXQoY29tbWl0OiBCdWZmZXIpOiB2b2lkO1xuICBwcm9jZXNzUHJvcG9zYWxzKFxuICBvcHR5cGU6IDAgfCAxLFxuICBwcm9wb3NhbHM6IEJ1ZmZlcixcbiAgcmVjb2duaXplZFVzZXJJZHM/OiBzdHJpbmdbXSlcbiAgOiBQcm9wb3NhbHNSZXN1bHQ7XG4gIHByb2Nlc3NXZWxjb21lKHdlbGNvbWU6IEJ1ZmZlcik6IHZvaWQ7XG4gIHJlYWR5OiBib29sZWFuO1xuICByZWluaXQocHJvdG9jb2xWZXJzaW9uOiBudW1iZXIsIHVzZXJJZDogc3RyaW5nLCBjaGFubmVsSWQ6IHN0cmluZyk6IHZvaWQ7XG4gIHJlc2V0KCk6IHZvaWQ7XG4gIHNldEV4dGVybmFsU2VuZGVyKGV4dGVybmFsU2VuZGVyOiBCdWZmZXIpOiB2b2lkO1xuICBzZXRQYXNzdGhyb3VnaE1vZGUocGFzc3Rocm91Z2g6IGJvb2xlYW4sIGV4cGlyeTogbnVtYmVyKTogdm9pZDtcbiAgdm9pY2VQcml2YWN5Q29kZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUHJvcG9zYWxzUmVzdWx0IHtcbiAgY29tbWl0PzogQnVmZmVyO1xuICB3ZWxjb21lPzogQnVmZmVyO1xufVxuXG4vKipcbiAqIFRoZSBhbW91bnQgb2Ygc2Vjb25kcyB0aGF0IGEgcHJldmlvdXMgdHJhbnNpdGlvbiBzaG91bGQgYmUgdmFsaWQgZm9yLlxuICovXG5jb25zdCBUUkFOU0lUSU9OX0VYUElSWSA9IDEwO1xuXG4vKipcbiAqIFRoZSBhcmJpdHJhcnkgYW1vdW50IG9mIHNlY29uZHMgdG8gYWxsb3cgcGFzc3Rocm91Z2ggZm9yIG1pZC1kb3duZ3JhZGUuXG4gKiBHZW5lcmFsbHksIHRyYW5zaXRpb25zIGxhc3QgYWJvdXQgMyBzZWNvbmRzIG1heGltdW0sIGJ1dCB0aGlzIHNob3VsZCBjb3ZlciBmb3Igd2hlbiBjb25uZWN0aW9ucyBhcmUgZGVsYXllZC5cbiAqL1xuY29uc3QgVFJBTlNJVElPTl9FWFBJUllfUEVORElOR19ET1dOR1JBREUgPSAyNDtcblxuLyoqXG4gKiBUaGUgYW1vdW50IG9mIHBhY2tldHMgdG8gYWxsb3cgZGVjcnlwdGlvbiBmYWlsdXJlIGZvciB1bnRpbCB3ZSBkZWVtIHRoZSB0cmFuc2l0aW9uIGJhZCBhbmQgcmUtaW5pdGlhbGl6ZS5cbiAqIFVzdWFsbHkgNCBwYWNrZXRzIG9uIGEgZ29vZCBjb25uZWN0aW9uIG1heSBzbGlwIHBhc3Qgd2hlbiBlbnRlcmluZyBhIG5ldyBzZXNzaW9uLlxuICogQWZ0ZXIgcmUtaW5pdGlhbGl6aW5nLCA1LTI0IHBhY2tldHMgbWF5IGZhaWwgdG8gZGVjcnlwdCBhZnRlci5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfREVDUllQVElPTl9GQUlMVVJFX1RPTEVSQU5DRSA9IDM2O1xuXG5pbnRlcmZhY2UgVHJhbnNpdGlvblJlc3VsdCB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIHRyYW5zaXRpb25JZDogbnVtYmVyO1xufVxuLyoqXG4gKiBPcHRpb25zIHRoYXQgZGljdGF0ZSB0aGUgc2Vzc2lvbiBiZWhhdmlvci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEQVZFU2Vzc2lvbk9wdGlvbnMge1xuICBkZWNyeXB0aW9uRmFpbHVyZVRvbGVyYW5jZT86IG51bWJlciB8IHVuZGVmaW5lZDtcbn1cblxuLy8gQHRzLWlnbm9yZVxubGV0IERhdmV5OiB0eXBlb2YgaW1wb3J0KCdAc25henphaC9kYXZleScpO1xuXG50cnkge1xuICBEYXZleSA9IHJlcXVpcmUoJ0BzbmF6emFoL2RhdmV5Jyk7XG59IGNhdGNoIHtcbiAgLy8gQHRzLWlnbm9yZVxuICBEYXZleSA9IG5ldyBQcm94eSh7fSBhcyB0eXBlb2YgaW1wb3J0KCdAc25henphaC9kYXZleScpLCB7XG4gICAgZ2V0KF8sIHByb3ApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYERBVkUgcHJvdG9jb2wgc3VwcG9ydCByZXF1aXJlcyB0aGUgQHNuYXp6YWgvZGF2ZXkgcGFja2FnZS4gUGxlYXNlIGluc3RhbGwgaXQgdG8gdXNlIHRoaXMgZmVhdHVyZS5cXG5BdHRlbXB0ZWQgdG8gYWNjZXNzIHByb3BlcnR5ICR7U3RyaW5nKFxuICAgICAgICAgIHByb3BcbiAgICAgICAgKX0gb24gdGhlIERBVkVTZXNzaW9uIChjbGFzcyksIGJ1dCBEYXZleSBpcyBub3QgYXZhaWxhYmxlLmBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBUaGUgbWF4aW11bSBEQVZFIHByb3RvY29sIHZlcnNpb24gc3VwcG9ydGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWF4UHJvdG9jb2xWZXJzaW9uKCk6IG51bWJlciB7XG4gIHJldHVybiBEYXZleS5EQVZFX1BST1RPQ09MX1ZFUlNJT047XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgREFWRVNlc3Npb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBvbihldmVudDogJ2Vycm9yJywgbGlzdGVuZXI6IChlcnJvcjogRXJyb3IpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ2RlYnVnJywgbGlzdGVuZXI6IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ2tleVBhY2thZ2UnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IEJ1ZmZlcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKFxuICBldmVudDogJ2ludmFsaWRhdGVUcmFuc2l0aW9uJyxcbiAgbGlzdGVuZXI6ICh0cmFuc2l0aW9uSWQ6IG51bWJlcikgPT4gdm9pZClcbiAgOiB0aGlzO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgdGhlIERBVkUgcHJvdG9jb2wgZ3JvdXAgc2Vzc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIERBVkVTZXNzaW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIFRoZSBjaGFubmVsIGlkIHJlcHJlc2VudGVkIGJ5IHRoaXMgc2Vzc2lvbi5cbiAgICovXG4gIHB1YmxpYyBjaGFubmVsSWQ6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHVzZXIgaWQgcmVwcmVzZW50ZWQgYnkgdGhpcyBzZXNzaW9uLlxuICAgKi9cbiAgcHVibGljIHVzZXJJZDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJvdG9jb2wgdmVyc2lvbiBiZWluZyB1c2VkLlxuICAgKi9cbiAgcHVibGljIHByb3RvY29sVmVyc2lvbjogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgbGFzdCB0cmFuc2l0aW9uIGlkIGV4ZWN1dGVkLlxuICAgKi9cbiAgcHVibGljIGxhc3RUcmFuc2l0aW9uSWQ/OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFRoZSBwZW5kaW5nIHRyYW5zaXRpb25zLCBtYXBwZWQgYnkgdGhlaXIgSUQgYW5kIHRoZSBwcm90b2NvbCB2ZXJzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBwZW5kaW5nVHJhbnNpdGlvbnMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPigpO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgc2Vzc2lvbiB3YXMgZG93bmdyYWRlZCBwcmV2aW91c2x5LlxuICAgKi9cbiAgcHJpdmF0ZSBkb3duZ3JhZGVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIFRoZSBhbW91bnQgb2YgY29uc2VjdXRpdmUgZmFpbHVyZXMgZW5jb3VudGVyZWQgd2hlbiBkZWNyeXB0aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBjb25zZWN1dGl2ZUZhaWx1cmVzID0gMDtcblxuICAvKipcbiAgICogVGhlIGFtb3VudCBvZiBjb25zZWN1dGl2ZSBmYWlsdXJlcyBuZWVkZWQgdG8gYXR0ZW1wdCB0byByZWNvdmVyLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBmYWlsdXJlVG9sZXJhbmNlOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhpcyBzZXNzaW9uIGlzIGN1cnJlbnRseSByZS1pbml0aWFsaXppbmcgZHVlIHRvIGFuIGludmFsaWQgdHJhbnNpdGlvbi5cbiAgICovXG4gIHB1YmxpYyByZWluaXRpYWxpemluZyA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBUaGUgdW5kZXJseWluZyBEQVZFIFNlc3Npb24gb2YgdGhpcyB3cmFwcGVyLlxuICAgKi9cbiAgcHVibGljIHNlc3Npb246IFNlc3Npb25NZXRob2RzIHwgdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgcHJvdG9jb2xWZXJzaW9uOiBudW1iZXIsXG4gIHVzZXJJZDogc3RyaW5nLFxuICBjaGFubmVsSWQ6IHN0cmluZyxcbiAgb3B0aW9uczogREFWRVNlc3Npb25PcHRpb25zKVxuICB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMucHJvdG9jb2xWZXJzaW9uID0gcHJvdG9jb2xWZXJzaW9uO1xuICAgIHRoaXMudXNlcklkID0gdXNlcklkO1xuICAgIHRoaXMuY2hhbm5lbElkID0gY2hhbm5lbElkO1xuICAgIHRoaXMuZmFpbHVyZVRvbGVyYW5jZSA9XG4gICAgb3B0aW9ucy5kZWNyeXB0aW9uRmFpbHVyZVRvbGVyYW5jZSA/P1xuICAgIERFRkFVTFRfREVDUllQVElPTl9GQUlMVVJFX1RPTEVSQU5DRTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCB2b2ljZSBwcml2YWN5IGNvZGUgb2YgdGhlIHNlc3Npb24uIFdpbGwgYmUgYG51bGxgIGlmIHRoZXJlIGlzIG5vIHNlc3Npb24uXG4gICAqL1xuICBwdWJsaWMgZ2V0IHZvaWNlUHJpdmFjeUNvZGUoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMucHJvdG9jb2xWZXJzaW9uID09PSAwIHx8ICF0aGlzLnNlc3Npb24/LnZvaWNlUHJpdmFjeUNvZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNlc3Npb24udm9pY2VQcml2YWN5Q29kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSB2ZXJpZmljYXRpb24gY29kZSBmb3IgYSB1c2VyIGluIHRoZSBzZXNzaW9uLlxuICAgKlxuICAgKiBAdGhyb3dzIFdpbGwgdGhyb3cgaWYgdGhlcmUgaXMgbm90IGFuIGFjdGl2ZSBzZXNzaW9uIG9yIHRoZSB1c2VyIGlkIHByb3ZpZGVkIGlzIGludmFsaWQgb3Igbm90IGluIHRoZSBzZXNzaW9uLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdldFZlcmlmaWNhdGlvbkNvZGUodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmICghdGhpcy5zZXNzaW9uKSB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gbm90IGF2YWlsYWJsZScpO1xuICAgIHJldHVybiB0aGlzLnNlc3Npb24uZ2V0VmVyaWZpY2F0aW9uQ29kZSh1c2VySWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlLWluaXRpYWxpemVzIChvciBpbml0aWFsaXplcykgdGhlIHVuZGVybHlpbmcgc2Vzc2lvbi5cbiAgICovXG4gIHB1YmxpYyByZWluaXQoKSB7XG4gICAgaWYgKHRoaXMucHJvdG9jb2xWZXJzaW9uID4gMCkge1xuICAgICAgaWYgKHRoaXMuc2Vzc2lvbikge1xuICAgICAgICB0aGlzLnNlc3Npb24ucmVpbml0KHRoaXMucHJvdG9jb2xWZXJzaW9uLCB0aGlzLnVzZXJJZCwgdGhpcy5jaGFubmVsSWQpO1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgJ2RlYnVnJyxcbiAgICAgICAgICBgU2Vzc2lvbiByZWluaXRpYWxpemVkIGZvciBwcm90b2NvbCB2ZXJzaW9uICR7dGhpcy5wcm90b2NvbFZlcnNpb259YFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXNzaW9uID0gbmV3IERhdmV5LkRBVkVTZXNzaW9uKFxuICAgICAgICAgIHRoaXMucHJvdG9jb2xWZXJzaW9uLFxuICAgICAgICAgIHRoaXMudXNlcklkLFxuICAgICAgICAgIHRoaXMuY2hhbm5lbElkXG4gICAgICAgICk7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAnZGVidWcnLFxuICAgICAgICAgIGBTZXNzaW9uIGluaXRpYWxpemVkIGZvciBwcm90b2NvbCB2ZXJzaW9uICR7dGhpcy5wcm90b2NvbFZlcnNpb259YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmVtaXQoJ2tleVBhY2thZ2UnLCB0aGlzLnNlc3Npb24hLmdldFNlcmlhbGl6ZWRLZXlQYWNrYWdlKCkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zZXNzaW9uKSB7XG4gICAgICB0aGlzLnNlc3Npb24ucmVzZXQoKTtcbiAgICAgIHRoaXMuc2Vzc2lvbi5zZXRQYXNzdGhyb3VnaE1vZGUodHJ1ZSwgVFJBTlNJVElPTl9FWFBJUlkpO1xuICAgICAgdGhpcy5lbWl0KCdkZWJ1ZycsICdTZXNzaW9uIHJlc2V0Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgZXh0ZXJuYWwgc2VuZGVyIGZvciB0aGlzIHNlc3Npb24uXG4gICAqXG4gICAqIEBwYXJhbSBleHRlcm5hbFNlbmRlciAtIFRoZSBleHRlcm5hbCBzZW5kZXJcbiAgICovXG4gIHB1YmxpYyBzZXRFeHRlcm5hbFNlbmRlcihleHRlcm5hbFNlbmRlcjogQnVmZmVyKSB7XG4gICAgaWYgKCF0aGlzLnNlc3Npb24pIHRocm93IG5ldyBFcnJvcignTm8gc2Vzc2lvbiBhdmFpbGFibGUnKTtcbiAgICB0aGlzLnNlc3Npb24uc2V0RXh0ZXJuYWxTZW5kZXIoZXh0ZXJuYWxTZW5kZXIpO1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCAnU2V0IE1MUyBleHRlcm5hbCBzZW5kZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGZvciBhIHRyYW5zaXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIHRyYW5zaXRpb24gZGF0YVxuICAgKiBAcmV0dXJucyBXaGV0aGVyIHdlIHNob3VsZCBzaWduYWwgdG8gdGhlIHZvaWNlIHNlcnZlciB0aGF0IHdlIGFyZSByZWFkeVxuICAgKi9cbiAgcHVibGljIHByZXBhcmVUcmFuc2l0aW9uKGRhdGE6IFZvaWNlRGF2ZVByZXBhcmVUcmFuc2l0aW9uRGF0YSkge1xuICAgIHRoaXMuZW1pdChcbiAgICAgICdkZWJ1ZycsXG4gICAgICBgUHJlcGFyaW5nIGZvciB0cmFuc2l0aW9uICgke2RhdGEudHJhbnNpdGlvbl9pZH0sIHYke2RhdGEucHJvdG9jb2xfdmVyc2lvbn0pYFxuICAgICk7XG4gICAgdGhpcy5wZW5kaW5nVHJhbnNpdGlvbnMuc2V0KGRhdGEudHJhbnNpdGlvbl9pZCwgZGF0YS5wcm90b2NvbF92ZXJzaW9uKTtcblxuICAgIC8vIFdoZW4gdGhlIGluY2x1ZGVkIHRyYW5zaXRpb24gaWQgaXMgMCwgdGhlIHRyYW5zaXRpb24gaXMgZm9yIChyZSlpbml0aWFsaXphdGlvbiBhbmQgaXQgY2FuIGJlIGV4ZWN1dGVkIGltbWVkaWF0ZWx5LlxuICAgIGlmIChkYXRhLnRyYW5zaXRpb25faWQgPT09IDApIHtcbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oZGF0YS50cmFuc2l0aW9uX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGRhdGEucHJvdG9jb2xfdmVyc2lvbiA9PT0gMClcbiAgICAgIHRoaXMuc2Vzc2lvbj8uc2V0UGFzc3Rocm91Z2hNb2RlKFxuICAgICAgICB0cnVlLFxuICAgICAgICBUUkFOU0lUSU9OX0VYUElSWV9QRU5ESU5HX0RPV05HUkFERVxuICAgICAgKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgdHJhbnNpdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHRyYW5zaXRpb25JZCAtIFRoZSB0cmFuc2l0aW9uIGlkIHRvIGV4ZWN1dGUgb25cbiAgICovXG4gIHB1YmxpYyBleGVjdXRlVHJhbnNpdGlvbih0cmFuc2l0aW9uSWQ6IG51bWJlcikge1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBgRXhlY3V0aW5nIHRyYW5zaXRpb24gKCR7dHJhbnNpdGlvbklkfSlgKTtcbiAgICBpZiAoIXRoaXMucGVuZGluZ1RyYW5zaXRpb25zLmhhcyh0cmFuc2l0aW9uSWQpKSB7XG4gICAgICB0aGlzLmVtaXQoXG4gICAgICAgICdkZWJ1ZycsXG4gICAgICAgIGBSZWNlaXZlZCBleGVjdXRlIHRyYW5zaXRpb24sIGJ1dCB3ZSBkb24ndCBoYXZlIGEgcGVuZGluZyB0cmFuc2l0aW9uIGZvciAke3RyYW5zaXRpb25JZH1gXG4gICAgICApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IG9sZFZlcnNpb24gPSB0aGlzLnByb3RvY29sVmVyc2lvbjtcbiAgICB0aGlzLnByb3RvY29sVmVyc2lvbiA9IHRoaXMucGVuZGluZ1RyYW5zaXRpb25zLmdldCh0cmFuc2l0aW9uSWQpITtcblxuICAgIC8vIEhhbmRsZSB1cGdyYWRlcyAmIGRlZmVyIGRvd25ncmFkZXNcbiAgICBpZiAob2xkVmVyc2lvbiAhPT0gdGhpcy5wcm90b2NvbFZlcnNpb24gJiYgdGhpcy5wcm90b2NvbFZlcnNpb24gPT09IDApIHtcbiAgICAgIHRoaXMuZG93bmdyYWRlZCA9IHRydWU7XG4gICAgICB0aGlzLmVtaXQoJ2RlYnVnJywgJ1Nlc3Npb24gZG93bmdyYWRlZCcpO1xuICAgIH0gZWxzZSBpZiAodHJhbnNpdGlvbklkID4gMCAmJiB0aGlzLmRvd25ncmFkZWQpIHtcbiAgICAgIHRoaXMuZG93bmdyYWRlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5zZXNzaW9uPy5zZXRQYXNzdGhyb3VnaE1vZGUodHJ1ZSwgVFJBTlNJVElPTl9FWFBJUlkpO1xuICAgICAgdGhpcy5lbWl0KCdkZWJ1ZycsICdTZXNzaW9uIHVwZ3JhZGVkJyk7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlIGZ1dHVyZSB3ZSdkIHdhbnQgdG8gc2lnbmFsIHRvIHRoZSBEQVZFU2Vzc2lvbiB0byB0cmFuc2l0aW9uIGFsc28sIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIHYxIGF0IHRoaXMgdGltZVxuICAgIHRoaXMucmVpbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICB0aGlzLmxhc3RUcmFuc2l0aW9uSWQgPSB0cmFuc2l0aW9uSWQ7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgJ2RlYnVnJyxcbiAgICAgIGBUcmFuc2l0aW9uIGV4ZWN1dGVkICh2JHtvbGRWZXJzaW9ufSAtPiB2JHt0aGlzLnByb3RvY29sVmVyc2lvbn0sIGlkOiAke3RyYW5zaXRpb25JZH0pYFxuICAgICk7XG5cbiAgICB0aGlzLnBlbmRpbmdUcmFuc2l0aW9ucy5kZWxldGUodHJhbnNpdGlvbklkKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGZvciBhIG5ldyBlcG9jaC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZXBvY2ggZGF0YVxuICAgKi9cbiAgcHVibGljIHByZXBhcmVFcG9jaChkYXRhOiBWb2ljZURhdmVQcmVwYXJlRXBvY2hEYXRhKSB7XG4gICAgdGhpcy5lbWl0KCdkZWJ1ZycsIGBQcmVwYXJpbmcgZm9yIGVwb2NoICgke2RhdGEuZXBvY2h9KWApO1xuICAgIGlmIChkYXRhLmVwb2NoID09PSAxKSB7XG4gICAgICB0aGlzLnByb3RvY29sVmVyc2lvbiA9IGRhdGEucHJvdG9jb2xfdmVyc2lvbjtcbiAgICAgIHRoaXMucmVpbml0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXIgZnJvbSBhbiBpbnZhbGlkIHRyYW5zaXRpb24gYnkgcmUtaW5pdGlhbGl6aW5nLlxuICAgKlxuICAgKiBAcGFyYW0gdHJhbnNpdGlvbklkIC0gVGhlIHRyYW5zaXRpb24gaWQgdG8gaW52YWxpZGF0ZVxuICAgKi9cbiAgcHVibGljIHJlY292ZXJGcm9tSW52YWxpZFRyYW5zaXRpb24odHJhbnNpdGlvbklkOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5yZWluaXRpYWxpemluZykgcmV0dXJuO1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBgSW52YWxpZGF0aW5nIHRyYW5zaXRpb24gJHt0cmFuc2l0aW9uSWR9YCk7XG4gICAgdGhpcy5yZWluaXRpYWxpemluZyA9IHRydWU7XG4gICAgdGhpcy5jb25zZWN1dGl2ZUZhaWx1cmVzID0gMDtcbiAgICB0aGlzLmVtaXQoJ2ludmFsaWRhdGVUcmFuc2l0aW9uJywgdHJhbnNpdGlvbklkKTtcbiAgICB0aGlzLnJlaW5pdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBwcm9wb3NhbHMgZnJvbSB0aGUgTUxTIGdyb3VwLlxuICAgKlxuICAgKiBAcGFyYW0gcGF5bG9hZCAtIFRoZSBiaW5hcnkgbWVzc2FnZSBwYXlsb2FkXG4gICAqIEBwYXJhbSBjb25uZWN0ZWRDbGllbnRzIC0gVGhlIHNldCBvZiBjb25uZWN0ZWQgY2xpZW50IElEc1xuICAgKiBAcmV0dXJucyBUaGUgcGF5bG9hZCB0byBzZW5kIGJhY2sgdG8gdGhlIHZvaWNlIHNlcnZlciwgaWYgdGhlcmUgaXMgb25lXG4gICAqL1xuICBwdWJsaWMgcHJvY2Vzc1Byb3Bvc2FscyhcbiAgcGF5bG9hZDogQnVmZmVyLFxuICBjb25uZWN0ZWRDbGllbnRzOiBTZXQ8c3RyaW5nPilcbiAgOiBCdWZmZXIgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zZXNzaW9uKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlc3Npb24gYXZhaWxhYmxlJyk7XG4gICAgY29uc3Qgb3B0eXBlID0gcGF5bG9hZC5yZWFkVUludDgoMCkgYXMgMCB8IDE7XG4gICAgY29uc3QgeyBjb21taXQsIHdlbGNvbWUgfSA9IHRoaXMuc2Vzc2lvbi5wcm9jZXNzUHJvcG9zYWxzKFxuICAgICAgb3B0eXBlLFxuICAgICAgcGF5bG9hZC5zdWJhcnJheSgxKSxcbiAgICAgIEFycmF5LmZyb20oY29ubmVjdGVkQ2xpZW50cylcbiAgICApO1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCAnTUxTIHByb3Bvc2FscyBwcm9jZXNzZWQnKTtcbiAgICBpZiAoIWNvbW1pdCkgcmV0dXJuO1xuICAgIHJldHVybiB3ZWxjb21lID8gQnVmZmVyLmNvbmNhdChbY29tbWl0LCB3ZWxjb21lXSkgOiBjb21taXQ7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGEgY29tbWl0IGZyb20gdGhlIE1MUyBncm91cC5cbiAgICpcbiAgICogQHBhcmFtIHBheWxvYWQgLSBUaGUgcGF5bG9hZFxuICAgKiBAcmV0dXJucyBUaGUgdHJhbnNhY3Rpb24gaWQgYW5kIHdoZXRoZXIgaXQgd2FzIHN1Y2Nlc3NmdWxcbiAgICovXG4gIHB1YmxpYyBwcm9jZXNzQ29tbWl0KHBheWxvYWQ6IEJ1ZmZlcik6IFRyYW5zaXRpb25SZXN1bHQge1xuICAgIGlmICghdGhpcy5zZXNzaW9uKSB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlc3Npb24gYXZhaWxhYmxlJyk7XG4gICAgY29uc3QgdHJhbnNpdGlvbklkID0gcGF5bG9hZC5yZWFkVUludDE2QkUoMCk7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2Vzc2lvbi5wcm9jZXNzQ29tbWl0KHBheWxvYWQuc3ViYXJyYXkoMikpO1xuICAgICAgaWYgKHRyYW5zaXRpb25JZCA9PT0gMCkge1xuICAgICAgICB0aGlzLnJlaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGFzdFRyYW5zaXRpb25JZCA9IHRyYW5zaXRpb25JZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGVuZGluZ1RyYW5zaXRpb25zLnNldCh0cmFuc2l0aW9uSWQsIHRoaXMucHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAnZGVidWcnLFxuICAgICAgICBgTUxTIGNvbW1pdCBwcm9jZXNzZWQgKHRyYW5zaXRpb24gaWQ6ICR7dHJhbnNpdGlvbklkfSlgXG4gICAgICApO1xuICAgICAgcmV0dXJuIHsgdHJhbnNpdGlvbklkLCBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2RlYnVnJyxcbiAgICAgICAgYE1MUyBjb21taXQgZXJyb3JlZCBmcm9tIHRyYW5zaXRpb24gJHt0cmFuc2l0aW9uSWR9OiAke2Vycm9yfWBcbiAgICAgICk7XG4gICAgICB0aGlzLnJlY292ZXJGcm9tSW52YWxpZFRyYW5zaXRpb24odHJhbnNpdGlvbklkKTtcbiAgICAgIHJldHVybiB7IHRyYW5zaXRpb25JZCwgc3VjY2VzczogZmFsc2UgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGEgd2VsY29tZSBmcm9tIHRoZSBNTFMgZ3JvdXAuXG4gICAqXG4gICAqIEBwYXJhbSBwYXlsb2FkIC0gVGhlIHBheWxvYWRcbiAgICogQHJldHVybnMgVGhlIHRyYW5zYWN0aW9uIGlkIGFuZCB3aGV0aGVyIGl0IHdhcyBzdWNjZXNzZnVsXG4gICAqL1xuICBwdWJsaWMgcHJvY2Vzc1dlbGNvbWUocGF5bG9hZDogQnVmZmVyKTogVHJhbnNpdGlvblJlc3VsdCB7XG4gICAgaWYgKCF0aGlzLnNlc3Npb24pIHRocm93IG5ldyBFcnJvcignTm8gc2Vzc2lvbiBhdmFpbGFibGUnKTtcbiAgICBjb25zdCB0cmFuc2l0aW9uSWQgPSBwYXlsb2FkLnJlYWRVSW50MTZCRSgwKTtcbiAgICB0cnkge1xuICAgICAgdGhpcy5zZXNzaW9uLnByb2Nlc3NXZWxjb21lKHBheWxvYWQuc3ViYXJyYXkoMikpO1xuICAgICAgaWYgKHRyYW5zaXRpb25JZCA9PT0gMCkge1xuICAgICAgICB0aGlzLnJlaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMubGFzdFRyYW5zaXRpb25JZCA9IHRyYW5zaXRpb25JZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucGVuZGluZ1RyYW5zaXRpb25zLnNldCh0cmFuc2l0aW9uSWQsIHRoaXMucHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAnZGVidWcnLFxuICAgICAgICBgTUxTIHdlbGNvbWUgcHJvY2Vzc2VkICh0cmFuc2l0aW9uIGlkOiAke3RyYW5zaXRpb25JZH0pYFxuICAgICAgKTtcbiAgICAgIHJldHVybiB7IHRyYW5zaXRpb25JZCwgc3VjY2VzczogdHJ1ZSB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmVtaXQoXG4gICAgICAgICdkZWJ1ZycsXG4gICAgICAgIGBNTFMgd2VsY29tZSBlcnJvcmVkIGZyb20gdHJhbnNpdGlvbiAke3RyYW5zaXRpb25JZH06ICR7ZXJyb3J9YFxuICAgICAgKTtcbiAgICAgIHRoaXMucmVjb3ZlckZyb21JbnZhbGlkVHJhbnNpdGlvbih0cmFuc2l0aW9uSWQpO1xuICAgICAgcmV0dXJuIHsgdHJhbnNpdGlvbklkLCBzdWNjZXNzOiBmYWxzZSB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFbmNyeXB0IGEgcGFja2V0IHVzaW5nIGVuZC10by1lbmQgZW5jcnlwdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhY2tldCAtIFRoZSBwYWNrZXQgdG8gZW5jcnlwdFxuICAgKi9cbiAgcHVibGljIGVuY3J5cHQocGFja2V0OiBCdWZmZXIpIHtcbiAgICBpZiAoXG4gICAgdGhpcy5wcm90b2NvbFZlcnNpb24gPT09IDAgfHxcbiAgICAhdGhpcy5zZXNzaW9uPy5yZWFkeSB8fFxuICAgIHBhY2tldC5lcXVhbHMoU0lMRU5DRV9GUkFNRSkpXG5cbiAgICByZXR1cm4gcGFja2V0O1xuICAgIHJldHVybiB0aGlzLnNlc3Npb24uZW5jcnlwdE9wdXMocGFja2V0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWNyeXB0IGEgcGFja2V0IHVzaW5nIGVuZC10by1lbmQgZW5jcnlwdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHBhY2tldCAtIFRoZSBwYWNrZXQgdG8gZGVjcnlwdFxuICAgKiBAcGFyYW0gdXNlcklkIC0gVGhlIHVzZXIgaWQgdGhhdCBzZW50IHRoZSBwYWNrZXRcbiAgICogQHJldHVybnMgVGhlIGRlY3J5cHRlZCBwYWNrZXQsIG9yIGBudWxsYCBpZiB0aGUgZGVjcnlwdGlvbiBmYWlsZWQgYnV0IHNob3VsZCBiZSBpZ25vcmVkXG4gICAqL1xuICBwdWJsaWMgZGVjcnlwdChwYWNrZXQ6IEJ1ZmZlciwgdXNlcklkOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjYW5EZWNyeXB0ID1cbiAgICB0aGlzLnNlc3Npb24/LnJlYWR5ICYmIChcbiAgICB0aGlzLnByb3RvY29sVmVyc2lvbiAhPT0gMCB8fCB0aGlzLnNlc3Npb24/LmNhblBhc3N0aHJvdWdoKHVzZXJJZCkpO1xuICAgIGlmIChwYWNrZXQuZXF1YWxzKFNJTEVOQ0VfRlJBTUUpIHx8ICFjYW5EZWNyeXB0IHx8ICF0aGlzLnNlc3Npb24pXG4gICAgcmV0dXJuIHBhY2tldDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgYnVmZmVyID0gdGhpcy5zZXNzaW9uLmRlY3J5cHQoXG4gICAgICAgIHVzZXJJZCxcbiAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciAtIGNvbnN0IGVudW0gaXMgZXhwb3J0ZWQgYW5kIHdvcmtzICh0b2RvOiBkcm9wIGNvbnN0IG1vZGlmaWVyIG9uIERhdmV5IGVuZClcbiAgICAgICAgRGF2ZXkuTWVkaWFUeXBlLkFVRElPLFxuICAgICAgICBwYWNrZXRcbiAgICAgICk7XG4gICAgICB0aGlzLmNvbnNlY3V0aXZlRmFpbHVyZXMgPSAwO1xuICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKCF0aGlzLnJlaW5pdGlhbGl6aW5nICYmIHRoaXMucGVuZGluZ1RyYW5zaXRpb25zLnNpemUgPT09IDApIHtcbiAgICAgICAgdGhpcy5jb25zZWN1dGl2ZUZhaWx1cmVzKys7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAnZGVidWcnLFxuICAgICAgICAgIGBGYWlsZWQgdG8gZGVjcnlwdCBhIHBhY2tldCAoJHt0aGlzLmNvbnNlY3V0aXZlRmFpbHVyZXN9IGNvbnNlY3V0aXZlIGZhaWxzKWBcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMuY29uc2VjdXRpdmVGYWlsdXJlcyA+IHRoaXMuZmFpbHVyZVRvbGVyYW5jZSkge1xuICAgICAgICAgIGlmICh0aGlzLmxhc3RUcmFuc2l0aW9uSWQpXG4gICAgICAgICAgdGhpcy5yZWNvdmVyRnJvbUludmFsaWRUcmFuc2l0aW9uKHRoaXMubGFzdFRyYW5zaXRpb25JZCk7ZWxzZVxuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucmVpbml0aWFsaXppbmcpIHtcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICdkZWJ1ZycsXG4gICAgICAgICAgJ0ZhaWxlZCB0byBkZWNyeXB0IGEgcGFja2V0IChyZWluaXRpYWxpemluZyBzZXNzaW9uKSdcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5wZW5kaW5nVHJhbnNpdGlvbnMuc2l6ZSA+IDApIHtcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICdkZWJ1ZycsXG4gICAgICAgICAgYEZhaWxlZCB0byBkZWNyeXB0IGEgcGFja2V0ICgke3RoaXMucGVuZGluZ1RyYW5zaXRpb25zLnNpemV9IHBlbmRpbmcgdHJhbnNpdGlvbltzXSlgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIHRoZSBzZXNzaW9uLlxuICAgKi9cbiAgcHVibGljIGRlc3Ryb3koKSB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2Vzc2lvbj8ucmVzZXQoKTtcbiAgICB9IGNhdGNoIHtcblxuICAgICAgLy9cbiAgICB9fVxufSIsICIvLyBDb3B5cmlnaHQgZGlzY29yZC1wbGF5ZXIgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIExpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgZGlzY29yZC5qcyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBBcGFjaGUgTGljZW5zZSAyLjBcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci10cy1leHBlY3QtZXJyb3IsIEB0eXBlc2NyaXB0LWVzbGludC9tZXRob2Qtc2lnbmF0dXJlLXN0eWxlICovXG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdub2RlOmV2ZW50cyc7XG5pbXBvcnQgeyBhZGRBdWRpb1BsYXllciwgZGVsZXRlQXVkaW9QbGF5ZXIgfSBmcm9tICcuLi9EYXRhU3RvcmUnO1xuaW1wb3J0IHtcbiAgVm9pY2VDb25uZWN0aW9uU3RhdHVzLFxuICB0eXBlIFZvaWNlQ29ubmVjdGlvbiB9IGZyb21cbicuLi9Wb2ljZUNvbm5lY3Rpb24nO1xuaW1wb3J0IHsgbm9vcCB9IGZyb20gJy4uL3V0aWwvdXRpbCc7XG5pbXBvcnQgeyBBdWRpb1BsYXllckVycm9yIH0gZnJvbSAnLi9BdWRpb1BsYXllckVycm9yJztcbmltcG9ydCB0eXBlIHsgQXVkaW9SZXNvdXJjZSB9IGZyb20gJy4vQXVkaW9SZXNvdXJjZSc7XG5pbXBvcnQgeyBQbGF5ZXJTdWJzY3JpcHRpb24gfSBmcm9tICcuL1BsYXllclN1YnNjcmlwdGlvbic7XG5pbXBvcnQgeyB1bnNhZmUgfSBmcm9tICcuLi9jb21tb24vdHlwZXMnO1xuXG4vLyBUaGUgT3B1cyBcInNpbGVudFwiIGZyYW1lXG5leHBvcnQgY29uc3QgU0lMRU5DRV9GUkFNRSA9IEJ1ZmZlci5mcm9tKFsweGY4LCAweGZmLCAweGZlXSk7XG5cbi8qKlxuICogRGVzY3JpYmVzIHRoZSBiZWhhdmlvciBvZiB0aGUgcGxheWVyIHdoZW4gYW4gYXVkaW8gcGFja2V0IGlzIHBsYXllZCBidXQgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZVxuICogdm9pY2UgY29ubmVjdGlvbnMgdG8gcGxheSB0by5cbiAqL1xuZXhwb3J0IGVudW0gTm9TdWJzY3JpYmVyQmVoYXZpb3Ige1xuICAvKipcbiAgICogUGF1c2VzIHBsYXlpbmcgdGhlIHN0cmVhbSB1bnRpbCBhIHZvaWNlIGNvbm5lY3Rpb24gYmVjb21lcyBhdmFpbGFibGUuXG4gICAqL1xuICBQYXVzZSA9ICdwYXVzZScsXG5cbiAgLyoqXG4gICAqIENvbnRpbnVlcyB0byBwbGF5IHRocm91Z2ggdGhlIHJlc291cmNlIHJlZ2FyZGxlc3MuXG4gICAqL1xuICBQbGF5ID0gJ3BsYXknLFxuXG4gIC8qKlxuICAgKiBUaGUgcGxheWVyIHN0b3BzIGFuZCBlbnRlcnMgdGhlIElkbGUgc3RhdGUuXG4gICAqL1xuICBTdG9wID0gJ3N0b3AnLFxufVxuXG5leHBvcnQgZW51bSBBdWRpb1BsYXllclN0YXR1cyB7XG4gIC8qKlxuICAgKiBXaGVuIHRoZSBwbGF5ZXIgaGFzIHBhdXNlZCBpdHNlbGYuIE9ubHkgcG9zc2libGUgd2l0aCB0aGUgXCJwYXVzZVwiIG5vIHN1YnNjcmliZXIgYmVoYXZpb3IuXG4gICAqL1xuICBBdXRvUGF1c2VkID0gJ2F1dG9wYXVzZWQnLFxuXG4gIC8qKlxuICAgKiBXaGVuIHRoZSBwbGF5ZXIgaXMgd2FpdGluZyBmb3IgYW4gYXVkaW8gcmVzb3VyY2UgdG8gYmVjb21lIHJlYWRhYmxlIGJlZm9yZSB0cmFuc2l0aW9uaW5nIHRvIFBsYXlpbmcuXG4gICAqL1xuICBCdWZmZXJpbmcgPSAnYnVmZmVyaW5nJyxcblxuICAvKipcbiAgICogV2hlbiB0aGVyZSBpcyBjdXJyZW50bHkgbm8gcmVzb3VyY2UgZm9yIHRoZSBwbGF5ZXIgdG8gYmUgcGxheWluZy5cbiAgICovXG4gIElkbGUgPSAnaWRsZScsXG5cbiAgLyoqXG4gICAqIFdoZW4gdGhlIHBsYXllciBoYXMgYmVlbiBtYW51YWxseSBwYXVzZWQuXG4gICAqL1xuICBQYXVzZWQgPSAncGF1c2VkJyxcblxuICAvKipcbiAgICogV2hlbiB0aGUgcGxheWVyIGlzIGFjdGl2ZWx5IHBsYXlpbmcgYW4gYXVkaW8gcmVzb3VyY2UuXG4gICAqL1xuICBQbGF5aW5nID0gJ3BsYXlpbmcnLFxufVxuXG4vKipcbiAqIE9wdGlvbnMgdGhhdCBjYW4gYmUgcGFzc2VkIHdoZW4gY3JlYXRpbmcgYW4gYXVkaW8gcGxheWVyLCB1c2VkIHRvIHNwZWNpZnkgaXRzIGJlaGF2aW9yLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZUF1ZGlvUGxheWVyT3B0aW9ucyB7XG4gIGJlaGF2aW9ycz86IHtcbiAgICBtYXhNaXNzZWRGcmFtZXM/OiBudW1iZXI7XG4gICAgbm9TdWJzY3JpYmVyPzogTm9TdWJzY3JpYmVyQmVoYXZpb3I7XG4gIH07XG4gIGRlYnVnPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgc3RhdGUgdGhhdCBhbiBBdWRpb1BsYXllciBpcyBpbiB3aGVuIGl0IGhhcyBubyByZXNvdXJjZSB0byBwbGF5LiBUaGlzIGlzIHRoZSBzdGFydGluZyBzdGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBdWRpb1BsYXllcklkbGVTdGF0ZSB7XG4gIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZTtcbn1cblxuLyoqXG4gKiBUaGUgc3RhdGUgdGhhdCBhbiBBdWRpb1BsYXllciBpcyBpbiB3aGVuIGl0IGlzIHdhaXRpbmcgZm9yIGEgcmVzb3VyY2UgdG8gYmVjb21lIHJlYWRhYmxlLiBPbmNlIHRoaXNcbiAqIGhhcHBlbnMsIHRoZSBBdWRpb1BsYXllciB3aWxsIGVudGVyIHRoZSBQbGF5aW5nIHN0YXRlLiBJZiB0aGUgcmVzb3VyY2UgZW5kcy9lcnJvcnMgYmVmb3JlIHRoaXMsIHRoZW5cbiAqIGl0IHdpbGwgcmUtZW50ZXIgdGhlIElkbGUgc3RhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXVkaW9QbGF5ZXJCdWZmZXJpbmdTdGF0ZSB7XG4gIG9uRmFpbHVyZUNhbGxiYWNrOiAoKSA9PiB2b2lkO1xuICBvblJlYWRhYmxlQ2FsbGJhY2s6ICgpID0+IHZvaWQ7XG4gIG9uU3RyZWFtRXJyb3I6IChlcnJvcjogRXJyb3IpID0+IHZvaWQ7XG4gIC8qKlxuICAgKiBUaGUgcmVzb3VyY2UgdGhhdCB0aGUgQXVkaW9QbGF5ZXIgaXMgd2FpdGluZyBmb3JcbiAgICovXG4gIHJlc291cmNlOiBBdWRpb1Jlc291cmNlO1xuICBzdGF0dXM6IEF1ZGlvUGxheWVyU3RhdHVzLkJ1ZmZlcmluZztcbn1cblxuLyoqXG4gKiBUaGUgc3RhdGUgdGhhdCBhbiBBdWRpb1BsYXllciBpcyBpbiB3aGVuIGl0IGlzIGFjdGl2ZWx5IHBsYXlpbmcgYW4gQXVkaW9SZXNvdXJjZS4gV2hlbiBwbGF5YmFjayBlbmRzLFxuICogaXQgd2lsbCBlbnRlciB0aGUgSWRsZSBzdGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBdWRpb1BsYXllclBsYXlpbmdTdGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIGNvbnNlY3V0aXZlIHRpbWVzIHRoYXQgdGhlIGF1ZGlvIHJlc291cmNlIGhhcyBiZWVuIHVuYWJsZSB0byBwcm92aWRlIGFuIE9wdXMgZnJhbWUuXG4gICAqL1xuICBtaXNzZWRGcmFtZXM6IG51bWJlcjtcbiAgb25TdHJlYW1FcnJvcjogKGVycm9yOiBFcnJvcikgPT4gdm9pZDtcblxuICAvKipcbiAgICogVGhlIHBsYXliYWNrIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgY3VycmVudCBhdWRpbyByZXNvdXJjZS4gVGhpcyBpbmNsdWRlcyBmaWxsZXIgc2lsZW5jZSBwYWNrZXRzXG4gICAqIHRoYXQgaGF2ZSBiZWVuIHBsYXllZCB3aGVuIHRoZSByZXNvdXJjZSB3YXMgYnVmZmVyaW5nLlxuICAgKi9cbiAgcGxheWJhY2tEdXJhdGlvbjogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgcmVzb3VyY2UgdGhhdCBpcyBiZWluZyBwbGF5ZWQuXG4gICAqL1xuICByZXNvdXJjZTogQXVkaW9SZXNvdXJjZTtcblxuICBzdGF0dXM6IEF1ZGlvUGxheWVyU3RhdHVzLlBsYXlpbmc7XG59XG5cbi8qKlxuICogVGhlIHN0YXRlIHRoYXQgYW4gQXVkaW9QbGF5ZXIgaXMgaW4gd2hlbiBpdCBoYXMgZWl0aGVyIGJlZW4gZXhwbGljaXRseSBwYXVzZWQgYnkgdGhlIHVzZXIsIG9yIGRvbmVcbiAqIGF1dG9tYXRpY2FsbHkgYnkgdGhlIEF1ZGlvUGxheWVyIGl0c2VsZiBpZiB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIHN1YnNjcmliZXJzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEF1ZGlvUGxheWVyUGF1c2VkU3RhdGUge1xuICBvblN0cmVhbUVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB2b2lkO1xuICAvKipcbiAgICogVGhlIHBsYXliYWNrIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcyBvZiB0aGUgY3VycmVudCBhdWRpbyByZXNvdXJjZS4gVGhpcyBpbmNsdWRlcyBmaWxsZXIgc2lsZW5jZSBwYWNrZXRzXG4gICAqIHRoYXQgaGF2ZSBiZWVuIHBsYXllZCB3aGVuIHRoZSByZXNvdXJjZSB3YXMgYnVmZmVyaW5nLlxuICAgKi9cbiAgcGxheWJhY2tEdXJhdGlvbjogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCByZXNvdXJjZSBvZiB0aGUgYXVkaW8gcGxheWVyLlxuICAgKi9cbiAgcmVzb3VyY2U6IEF1ZGlvUmVzb3VyY2U7XG5cbiAgLyoqXG4gICAqIEhvdyBtYW55IHNpbGVuY2UgcGFja2V0cyBzdGlsbCBuZWVkIHRvIGJlIHBsYXllZCB0byBhdm9pZCBhdWRpbyBpbnRlcnBvbGF0aW9uIGR1ZSB0byB0aGUgc3RyZWFtIHN1ZGRlbmx5IHBhdXNpbmcuXG4gICAqL1xuICBzaWxlbmNlUGFja2V0c1JlbWFpbmluZzogbnVtYmVyO1xuXG4gIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuQXV0b1BhdXNlZCB8IEF1ZGlvUGxheWVyU3RhdHVzLlBhdXNlZDtcbn1cblxuLyoqXG4gKiBUaGUgdmFyaW91cyBzdGF0ZXMgdGhhdCB0aGUgcGxheWVyIGNhbiBiZSBpbi5cbiAqL1xuZXhwb3J0IHR5cGUgQXVkaW9QbGF5ZXJTdGF0ZSA9XG5BdWRpb1BsYXllckJ1ZmZlcmluZ1N0YXRlIHxcbkF1ZGlvUGxheWVySWRsZVN0YXRlIHxcbkF1ZGlvUGxheWVyUGF1c2VkU3RhdGUgfFxuQXVkaW9QbGF5ZXJQbGF5aW5nU3RhdGU7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWRlY2xhcmF0aW9uLW1lcmdpbmdcbmV4cG9ydCBpbnRlcmZhY2UgQXVkaW9QbGF5ZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAvKipcbiAgICogRW1pdHRlZCB3aGVuIHRoZXJlIGlzIGFuIGVycm9yIGVtaXR0ZWQgZnJvbSB0aGUgYXVkaW8gcmVzb3VyY2UgcGxheWVkIGJ5IHRoZSBhdWRpbyBwbGF5ZXJcbiAgICpcbiAgICogQGV2ZW50UHJvcGVydHlcbiAgICovXG4gIG9uKGV2ZW50OiAnZXJyb3InLCBsaXN0ZW5lcjogKGVycm9yOiBBdWRpb1BsYXllckVycm9yKSA9PiB2b2lkKTogdGhpcztcbiAgLyoqXG4gICAqIEVtaXR0ZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBhdWRpbyBwbGF5ZXJcbiAgICpcbiAgICogQGV2ZW50UHJvcGVydHlcbiAgICovXG4gIG9uKGV2ZW50OiAnZGVidWcnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCk6IHRoaXM7XG4gIC8qKlxuICAgKiBFbWl0dGVkIHdoZW4gdGhlIHN0YXRlIG9mIHRoZSBhdWRpbyBwbGF5ZXIgY2hhbmdlc1xuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb24oXG4gIGV2ZW50OiAnc3RhdGVDaGFuZ2UnLFxuICBsaXN0ZW5lcjogKG9sZFN0YXRlOiBBdWRpb1BsYXllclN0YXRlLCBuZXdTdGF0ZTogQXVkaW9QbGF5ZXJTdGF0ZSkgPT4gdm9pZClcbiAgOiB0aGlzO1xuICAvKipcbiAgICogRW1pdHRlZCB3aGVuIHRoZSBhdWRpbyBwbGF5ZXIgaXMgc3Vic2NyaWJlZCB0byBhIHZvaWNlIGNvbm5lY3Rpb25cbiAgICpcbiAgICogQGV2ZW50UHJvcGVydHlcbiAgICovXG4gIG9uKFxuICBldmVudDogJ3N1YnNjcmliZScgfCAndW5zdWJzY3JpYmUnLFxuICBsaXN0ZW5lcjogKHN1YnNjcmlwdGlvbjogUGxheWVyU3Vic2NyaXB0aW9uKSA9PiB2b2lkKVxuICA6IHRoaXM7XG4gIC8qKlxuICAgKiBFbWl0dGVkIHdoZW4gdGhlIHN0YXR1cyBvZiBzdGF0ZSBjaGFuZ2VzIHRvIGEgc3BlY2lmaWMgc3RhdHVzXG4gICAqXG4gICAqIEBldmVudFByb3BlcnR5XG4gICAqL1xuICBvbjxFdmVudCBleHRlbmRzIEF1ZGlvUGxheWVyU3RhdHVzPihcbiAgZXZlbnQ6IEV2ZW50LFxuICBsaXN0ZW5lcjogKFxuICBvbGRTdGF0ZTogQXVkaW9QbGF5ZXJTdGF0ZSxcbiAgbmV3U3RhdGU6IEF1ZGlvUGxheWVyU3RhdGUgJiB7c3RhdHVzOiBFdmVudDt9KVxuICA9PiB2b2lkKVxuICA6IHRoaXM7XG59XG5cbi8qKlxuICogU3RyaW5naWZpZXMgYW4gQXVkaW9QbGF5ZXJTdGF0ZSBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0gc3RhdGUgLSBUaGUgc3RhdGUgdG8gc3RyaW5naWZ5XG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeVN0YXRlKHN0YXRlOiBBdWRpb1BsYXllclN0YXRlKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgLi4uc3RhdGUsXG4gICAgcmVzb3VyY2U6IFJlZmxlY3QuaGFzKHN0YXRlLCAncmVzb3VyY2UnKSxcbiAgICBzdGVwVGltZW91dDogUmVmbGVjdC5oYXMoc3RhdGUsICdzdGVwVGltZW91dCcpXG4gIH0pO1xufVxuXG4vKipcbiAqIFVzZWQgdG8gcGxheSBhdWRpbyByZXNvdXJjZXMgKGkuZS4gdHJhY2tzLCBzdHJlYW1zKSB0byB2b2ljZSBjb25uZWN0aW9ucy5cbiAqXG4gKiBAcmVtYXJrc1xuICogQXVkaW8gcGxheWVycyBhcmUgZGVzaWduZWQgdG8gYmUgcmUtdXNlZCAtIGV2ZW4gaWYgYSByZXNvdXJjZSBoYXMgZmluaXNoZWQgcGxheWluZywgdGhlIHBsYXllciBpdHNlbGZcbiAqIGNhbiBzdGlsbCBiZSB1c2VkLlxuICpcbiAqIFRoZSBBdWRpb1BsYXllciBkcml2ZXMgdGhlIHRpbWluZyBvZiBwbGF5YmFjaywgYW5kIHRoZXJlZm9yZSBpcyB1bmFmZmVjdGVkIGJ5IHZvaWNlIGNvbm5lY3Rpb25zXG4gKiBiZWNvbWluZyB1bmF2YWlsYWJsZS4gSXRzIGJlaGF2aW9yIGluIHRoZXNlIHNjZW5hcmlvcyBjYW4gYmUgY29uZmlndXJlZC5cbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtZGVjbGFyYXRpb24tbWVyZ2luZ1xuZXhwb3J0IGNsYXNzIEF1ZGlvUGxheWVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIFRoZSBzdGF0ZSB0aGF0IHRoZSBBdWRpb1BsYXllciBpcyBpbi5cbiAgICovXG4gIHByaXZhdGUgX3N0YXRlOiBBdWRpb1BsYXllclN0YXRlO1xuXG4gIC8qKlxuICAgKiBBIGxpc3Qgb2YgVm9pY2VDb25uZWN0aW9ucyB0aGF0IGFyZSByZWdpc3RlcmVkIHRvIHRoaXMgQXVkaW9QbGF5ZXIuIFRoZSBwbGF5ZXIgd2lsbCBhdHRlbXB0IHRvIHBsYXkgYXVkaW9cbiAgICogdG8gdGhlIHN0cmVhbXMgaW4gdGhpcyBsaXN0LlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBzdWJzY3JpYmVyczogUGxheWVyU3Vic2NyaXB0aW9uW10gPSBbXTtcblxuICAvKipcbiAgICogVGhlIGJlaGF2aW9yIHRoYXQgdGhlIHBsYXllciBzaG91bGQgZm9sbG93IHdoZW4gaXQgZW50ZXJzIGNlcnRhaW4gc2l0dWF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgYmVoYXZpb3JzOiB7XG4gICAgbWF4TWlzc2VkRnJhbWVzOiBudW1iZXI7XG4gICAgbm9TdWJzY3JpYmVyOiBOb1N1YnNjcmliZXJCZWhhdmlvcjtcbiAgfTtcblxuICAvKipcbiAgICogVGhlIGRlYnVnIGxvZ2dlciBmdW5jdGlvbiwgaWYgZGVidWdnaW5nIGlzIGVuYWJsZWQuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGRlYnVnOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCBudWxsO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEF1ZGlvUGxheWVyLlxuICAgKi9cbiAgcHVibGljIGNvbnN0cnVjdG9yKG9wdGlvbnM6IENyZWF0ZUF1ZGlvUGxheWVyT3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLl9zdGF0ZSA9IHsgc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cy5JZGxlIH07XG4gICAgdGhpcy5iZWhhdmlvcnMgPSB7XG4gICAgICBub1N1YnNjcmliZXI6IE5vU3Vic2NyaWJlckJlaGF2aW9yLlBhdXNlLFxuICAgICAgbWF4TWlzc2VkRnJhbWVzOiA1LFxuICAgICAgLi4ub3B0aW9ucy5iZWhhdmlvcnNcbiAgICB9O1xuICAgIHRoaXMuZGVidWcgPVxuICAgIG9wdGlvbnMuZGVidWcgPT09IGZhbHNlID9cbiAgICBudWxsIDpcbiAgICAobWVzc2FnZTogc3RyaW5nKSA9PiB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICogQSBsaXN0IG9mIHN1YnNjcmliZWQgdm9pY2UgY29ubmVjdGlvbnMgdGhhdCBjYW4gY3VycmVudGx5IHJlY2VpdmUgYXVkaW8gdG8gcGxheS5cbiAgICovXG4gIHB1YmxpYyBnZXQgcGxheWFibGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3Vic2NyaWJlcnMuXG4gICAgZmlsdGVyKFxuICAgICAgKHsgY29ubmVjdGlvbiB9KSA9PlxuICAgICAgY29ubmVjdGlvbi5zdGF0ZS5zdGF0dXMgPT09IFZvaWNlQ29ubmVjdGlvblN0YXR1cy5SZWFkeVxuICAgICkuXG4gICAgbWFwKCh7IGNvbm5lY3Rpb24gfSkgPT4gY29ubmVjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcyBhIFZvaWNlQ29ubmVjdGlvbiB0byB0aGUgYXVkaW8gcGxheWVyJ3MgcGxheSBsaXN0LiBJZiB0aGUgVm9pY2VDb25uZWN0aW9uIGlzIGFscmVhZHkgc3Vic2NyaWJlZCxcbiAgICogdGhlbiB0aGUgZXhpc3Rpbmcgc3Vic2NyaXB0aW9uIGlzIHVzZWQuXG4gICAqXG4gICAqIEByZW1hcmtzXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBub3QgYmUgZGlyZWN0bHkgY2FsbGVkLiBJbnN0ZWFkLCB1c2UgVm9pY2VDb25uZWN0aW9uI3N1YnNjcmliZS5cbiAgICogQHBhcmFtIGNvbm5lY3Rpb24gLSBUaGUgY29ubmVjdGlvbiB0byBzdWJzY3JpYmVcbiAgICogQHJldHVybnMgVGhlIG5ldyBzdWJzY3JpcHRpb24gaWYgdGhlIHZvaWNlIGNvbm5lY3Rpb24gaXMgbm90IHlldCBzdWJzY3JpYmVkLCBvdGhlcndpc2UgdGhlIGV4aXN0aW5nIHN1YnNjcmlwdGlvblxuICAgKi9cbiAgLy8gQHRzLWlnbm9yZVxuICBwcml2YXRlIHN1YnNjcmliZShjb25uZWN0aW9uOiBWb2ljZUNvbm5lY3Rpb24pIHtcbiAgICBjb25zdCBleGlzdGluZ1N1YnNjcmlwdGlvbiA9IHRoaXMuc3Vic2NyaWJlcnMuZmluZChcbiAgICAgIChzdWJzY3JpcHRpb24pID0+IHN1YnNjcmlwdGlvbi5jb25uZWN0aW9uID09PSBjb25uZWN0aW9uXG4gICAgKTtcbiAgICBpZiAoIWV4aXN0aW5nU3Vic2NyaXB0aW9uKSB7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBuZXcgUGxheWVyU3Vic2NyaXB0aW9uKGNvbm5lY3Rpb24sIHRoaXMpO1xuICAgICAgdGhpcy5zdWJzY3JpYmVycy5wdXNoKHN1YnNjcmlwdGlvbik7XG4gICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gdGhpcy5lbWl0KCdzdWJzY3JpYmUnLCBzdWJzY3JpcHRpb24pKTtcbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4aXN0aW5nU3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFVuc3Vic2NyaWJlcyBhIHN1YnNjcmlwdGlvbiAtIGkuZS4gcmVtb3ZlcyBhIHZvaWNlIGNvbm5lY3Rpb24gZnJvbSB0aGUgcGxheSBsaXN0IG9mIHRoZSBhdWRpbyBwbGF5ZXIuXG4gICAqXG4gICAqIEByZW1hcmtzXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBub3QgYmUgZGlyZWN0bHkgY2FsbGVkLiBJbnN0ZWFkLCB1c2UgUGxheWVyU3Vic2NyaXB0aW9uI3Vuc3Vic2NyaWJlLlxuICAgKiBAcGFyYW0gc3Vic2NyaXB0aW9uIC0gVGhlIHN1YnNjcmlwdGlvbiB0byByZW1vdmVcbiAgICogQHJldHVybnMgV2hldGhlciBvciBub3QgdGhlIHN1YnNjcmlwdGlvbiBleGlzdGVkIG9uIHRoZSBwbGF5ZXIgYW5kIHdhcyByZW1vdmVkXG4gICAqL1xuICAvLyBAdHMtaWdub3JlXG4gIHByaXZhdGUgdW5zdWJzY3JpYmUoc3Vic2NyaXB0aW9uOiBQbGF5ZXJTdWJzY3JpcHRpb24pIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuc3Vic2NyaWJlcnMuaW5kZXhPZihzdWJzY3JpcHRpb24pO1xuICAgIGNvbnN0IGV4aXN0cyA9IGluZGV4ICE9PSAtMTtcbiAgICBpZiAoZXhpc3RzKSB7XG4gICAgICB0aGlzLnN1YnNjcmliZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICBzdWJzY3JpcHRpb24uY29ubmVjdGlvbi5zZXRTcGVha2luZyhmYWxzZSk7XG4gICAgICB0aGlzLmVtaXQoJ3Vuc3Vic2NyaWJlJywgc3Vic2NyaXB0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXhpc3RzO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzdGF0ZSB0aGF0IHRoZSBwbGF5ZXIgaXMgaW4uXG4gICAqL1xuICBwdWJsaWMgZ2V0IHN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgbmV3IHN0YXRlIGZvciB0aGUgcGxheWVyLCBwZXJmb3JtaW5nIGNsZWFuLXVwIG9wZXJhdGlvbnMgd2hlcmUgbmVjZXNzYXJ5LlxuICAgKi9cbiAgcHVibGljIHNldCBzdGF0ZShuZXdTdGF0ZTogQXVkaW9QbGF5ZXJTdGF0ZSkge1xuICAgIGNvbnN0IG9sZFN0YXRlID0gdGhpcy5fc3RhdGU7XG4gICAgY29uc3QgbmV3UmVzb3VyY2UgPSBSZWZsZWN0LmdldChuZXdTdGF0ZSwgJ3Jlc291cmNlJykgYXNcbiAgICBBdWRpb1Jlc291cmNlIHxcbiAgICB1bmRlZmluZWQ7XG5cbiAgICBpZiAoXG4gICAgb2xkU3RhdGUuc3RhdHVzICE9PSBBdWRpb1BsYXllclN0YXR1cy5JZGxlICYmXG4gICAgb2xkU3RhdGUucmVzb3VyY2UgIT09IG5ld1Jlc291cmNlKVxuICAgIHtcbiAgICAgIG9sZFN0YXRlLnJlc291cmNlLnBsYXlTdHJlYW0ub24oJ2Vycm9yJywgbm9vcCk7XG4gICAgICBvbGRTdGF0ZS5yZXNvdXJjZS5wbGF5U3RyZWFtLm9mZignZXJyb3InLCBvbGRTdGF0ZS5vblN0cmVhbUVycm9yKTtcbiAgICAgIG9sZFN0YXRlLnJlc291cmNlLmF1ZGlvUGxheWVyID0gdW5kZWZpbmVkO1xuICAgICAgb2xkU3RhdGUucmVzb3VyY2UucGxheVN0cmVhbS5kZXN0cm95KCk7XG4gICAgICBvbGRTdGF0ZS5yZXNvdXJjZS5wbGF5U3RyZWFtLnJlYWQoKTsgLy8gcmVxdWlyZWQgdG8gZW5zdXJlIGJ1ZmZlcmVkIGRhdGEgaXMgZHJhaW5lZCwgcHJldmVudHMgbWVtb3J5IGxlYWtcbiAgICB9XG5cbiAgICAvLyBXaGVuIGxlYXZpbmcgdGhlIEJ1ZmZlcmluZyBzdGF0ZSAob3IgYnVmZmVyaW5nIGEgbmV3IHJlc291cmNlKSwgdGhlbiByZW1vdmUgdGhlIGV2ZW50IGxpc3RlbmVycyBmcm9tIGl0XG4gICAgaWYgKFxuICAgIG9sZFN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuQnVmZmVyaW5nICYmIChcbiAgICBuZXdTdGF0ZS5zdGF0dXMgIT09IEF1ZGlvUGxheWVyU3RhdHVzLkJ1ZmZlcmluZyB8fFxuICAgIG5ld1N0YXRlLnJlc291cmNlICE9PSBvbGRTdGF0ZS5yZXNvdXJjZSkpXG4gICAge1xuICAgICAgb2xkU3RhdGUucmVzb3VyY2UucGxheVN0cmVhbS5vZmYoJ2VuZCcsIG9sZFN0YXRlLm9uRmFpbHVyZUNhbGxiYWNrKTtcbiAgICAgIG9sZFN0YXRlLnJlc291cmNlLnBsYXlTdHJlYW0ub2ZmKCdjbG9zZScsIG9sZFN0YXRlLm9uRmFpbHVyZUNhbGxiYWNrKTtcbiAgICAgIG9sZFN0YXRlLnJlc291cmNlLnBsYXlTdHJlYW0ub2ZmKCdmaW5pc2gnLCBvbGRTdGF0ZS5vbkZhaWx1cmVDYWxsYmFjayk7XG4gICAgICBvbGRTdGF0ZS5yZXNvdXJjZS5wbGF5U3RyZWFtLm9mZigncmVhZGFibGUnLCBvbGRTdGF0ZS5vblJlYWRhYmxlQ2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIHRyYW5zaXRpb25pbmcgaW50byBhbiBpZGxlIHNob3VsZCBlbnN1cmUgdGhhdCBjb25uZWN0aW9ucyBzdG9wIHNwZWFraW5nXG4gICAgaWYgKG5ld1N0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZSkge1xuICAgICAgdGhpcy5fc2lnbmFsU3RvcFNwZWFraW5nKCk7XG4gICAgICBkZWxldGVBdWRpb1BsYXllcih0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBhdHRhY2ggdG8gdGhlIGdsb2JhbCBhdWRpbyBwbGF5ZXIgdGltZXJcbiAgICBpZiAobmV3UmVzb3VyY2UpIHtcbiAgICAgIGFkZEF1ZGlvUGxheWVyKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIHBsYXlpbmcgLT4gcGxheWluZyBzdGF0ZSBjaGFuZ2VzIHNob3VsZCBzdGlsbCB0cmFuc2l0aW9uIGlmIGEgcmVzb3VyY2UgY2hhbmdlZCAoc2VlbXMgbGlrZSBpdCB3b3VsZCBiZSB1c2VmdWwhKVxuICAgIGNvbnN0IGRpZENoYW5nZVJlc291cmNlcyA9XG4gICAgb2xkU3RhdGUuc3RhdHVzICE9PSBBdWRpb1BsYXllclN0YXR1cy5JZGxlICYmXG4gICAgbmV3U3RhdGUuc3RhdHVzID09PSBBdWRpb1BsYXllclN0YXR1cy5QbGF5aW5nICYmXG4gICAgb2xkU3RhdGUucmVzb3VyY2UgIT09IG5ld1N0YXRlLnJlc291cmNlO1xuXG4gICAgdGhpcy5fc3RhdGUgPSBuZXdTdGF0ZTtcblxuICAgIHRoaXMuZW1pdCgnc3RhdGVDaGFuZ2UnLCBvbGRTdGF0ZSwgdGhpcy5fc3RhdGUpO1xuICAgIGlmIChvbGRTdGF0ZS5zdGF0dXMgIT09IG5ld1N0YXRlLnN0YXR1cyB8fCBkaWRDaGFuZ2VSZXNvdXJjZXMpIHtcbiAgICAgIHRoaXMuZW1pdChuZXdTdGF0ZS5zdGF0dXMsIG9sZFN0YXRlLCB0aGlzLl9zdGF0ZSBhcyB1bnNhZmUpO1xuICAgIH1cblxuICAgIHRoaXMuZGVidWc/LihcbiAgICAgIGBzdGF0ZSBjaGFuZ2U6XFxuZnJvbSAke3N0cmluZ2lmeVN0YXRlKG9sZFN0YXRlKX1cXG50byAke3N0cmluZ2lmeVN0YXRlKFxuICAgICAgICBuZXdTdGF0ZVxuICAgICAgKX1gXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQbGF5cyBhIG5ldyByZXNvdXJjZSBvbiB0aGUgcGxheWVyLiBJZiB0aGUgcGxheWVyIGlzIGFscmVhZHkgcGxheWluZyBhIHJlc291cmNlLCB0aGUgZXhpc3RpbmcgcmVzb3VyY2UgaXMgZGVzdHJveWVkXG4gICAqIChpdCBjYW5ub3QgYmUgcmV1c2VkLCBldmVuIGluIGFub3RoZXIgcGxheWVyKSBhbmQgaXMgcmVwbGFjZWQgd2l0aCB0aGUgbmV3IHJlc291cmNlLlxuICAgKlxuICAgKiBAcmVtYXJrc1xuICAgKiBUaGUgcGxheWVyIHdpbGwgdHJhbnNpdGlvbiB0byB0aGUgUGxheWluZyBzdGF0ZSBvbmNlIHBsYXliYWNrIGJlZ2lucywgYW5kIHdpbGwgcmV0dXJuIHRvIHRoZSBJZGxlIHN0YXRlIG9uY2VcbiAgICogcGxheWJhY2sgaXMgZW5kZWQuXG4gICAqXG4gICAqIElmIHRoZSBwbGF5ZXIgd2FzIHByZXZpb3VzbHkgcGxheWluZyBhIHJlc291cmNlIGFuZCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQsIHRoZSBwbGF5ZXIgd2lsbCBub3QgdHJhbnNpdGlvbiB0byB0aGVcbiAgICogSWRsZSBzdGF0ZSBkdXJpbmcgdGhlIHN3YXAgb3Zlci5cbiAgICogQHBhcmFtIHJlc291cmNlIC0gVGhlIHJlc291cmNlIHRvIHBsYXlcbiAgICogQHRocm93cyBXaWxsIHRocm93IGlmIGF0dGVtcHRpbmcgdG8gcGxheSBhbiBhdWRpbyByZXNvdXJjZSB0aGF0IGhhcyBhbHJlYWR5IGVuZGVkLCBvciBpcyBiZWluZyBwbGF5ZWQgYnkgYW5vdGhlciBwbGF5ZXJcbiAgICovXG4gIHB1YmxpYyBwbGF5PE1ldGFkYXRhPihyZXNvdXJjZTogQXVkaW9SZXNvdXJjZTxNZXRhZGF0YT4pIHtcbiAgICBpZiAocmVzb3VyY2UuZW5kZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHBsYXkgYSByZXNvdXJjZSB0aGF0IGhhcyBhbHJlYWR5IGVuZGVkLicpO1xuICAgIH1cblxuICAgIGlmIChyZXNvdXJjZS5hdWRpb1BsYXllcikge1xuICAgICAgaWYgKHJlc291cmNlLmF1ZGlvUGxheWVyID09PSB0aGlzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnUmVzb3VyY2UgaXMgYWxyZWFkeSBiZWluZyBwbGF5ZWQgYnkgYW5vdGhlciBhdWRpbyBwbGF5ZXIuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXNvdXJjZS5hdWRpb1BsYXllciA9IHRoaXM7XG5cbiAgICAvLyBBdHRhY2ggZXJyb3IgbGlzdGVuZXJzIHRvIHRoZSBzdHJlYW0gdGhhdCB3aWxsIHByb3BhZ2F0ZSB0aGUgZXJyb3IgYW5kIHRoZW4gcmV0dXJuIHRvIHRoZSBJZGxlXG4gICAgLy8gc3RhdGUgaWYgdGhlIHJlc291cmNlIGlzIHN0aWxsIGJlaW5nIHVzZWQuXG4gICAgY29uc3Qgb25TdHJlYW1FcnJvciA9IChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIGlmICh0aGlzLnN0YXRlLnN0YXR1cyAhPT0gQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZSkge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEF1ZGlvUGxheWVyRXJyb3IoZXJyb3IsIHRoaXMuc3RhdGUucmVzb3VyY2UpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgdGhpcy5zdGF0ZS5zdGF0dXMgIT09IEF1ZGlvUGxheWVyU3RhdHVzLklkbGUgJiZcbiAgICAgIHRoaXMuc3RhdGUucmVzb3VyY2UgPT09IHJlc291cmNlKVxuICAgICAge1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXNvdXJjZS5wbGF5U3RyZWFtLm9uY2UoJ2Vycm9yJywgb25TdHJlYW1FcnJvcik7XG5cbiAgICBpZiAocmVzb3VyY2Uuc3RhcnRlZCkge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cy5QbGF5aW5nLFxuICAgICAgICBtaXNzZWRGcmFtZXM6IDAsXG4gICAgICAgIHBsYXliYWNrRHVyYXRpb246IDAsXG4gICAgICAgIHJlc291cmNlLFxuICAgICAgICBvblN0cmVhbUVycm9yXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvblJlYWRhYmxlQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAgIGlmIChcbiAgICAgICAgdGhpcy5zdGF0ZS5zdGF0dXMgPT09IEF1ZGlvUGxheWVyU3RhdHVzLkJ1ZmZlcmluZyAmJlxuICAgICAgICB0aGlzLnN0YXRlLnJlc291cmNlID09PSByZXNvdXJjZSlcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBzdGF0dXM6IEF1ZGlvUGxheWVyU3RhdHVzLlBsYXlpbmcsXG4gICAgICAgICAgICBtaXNzZWRGcmFtZXM6IDAsXG4gICAgICAgICAgICBwbGF5YmFja0R1cmF0aW9uOiAwLFxuICAgICAgICAgICAgcmVzb3VyY2UsXG4gICAgICAgICAgICBvblN0cmVhbUVycm9yXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY29uc3Qgb25GYWlsdXJlQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAgIGlmIChcbiAgICAgICAgdGhpcy5zdGF0ZS5zdGF0dXMgPT09IEF1ZGlvUGxheWVyU3RhdHVzLkJ1ZmZlcmluZyAmJlxuICAgICAgICB0aGlzLnN0YXRlLnJlc291cmNlID09PSByZXNvdXJjZSlcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBzdGF0dXM6IEF1ZGlvUGxheWVyU3RhdHVzLklkbGVcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXNvdXJjZS5wbGF5U3RyZWFtLm9uY2UoJ3JlYWRhYmxlJywgb25SZWFkYWJsZUNhbGxiYWNrKTtcblxuICAgICAgcmVzb3VyY2UucGxheVN0cmVhbS5vbmNlKCdlbmQnLCBvbkZhaWx1cmVDYWxsYmFjayk7XG4gICAgICByZXNvdXJjZS5wbGF5U3RyZWFtLm9uY2UoJ2Nsb3NlJywgb25GYWlsdXJlQ2FsbGJhY2spO1xuICAgICAgcmVzb3VyY2UucGxheVN0cmVhbS5vbmNlKCdmaW5pc2gnLCBvbkZhaWx1cmVDYWxsYmFjayk7XG5cbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuQnVmZmVyaW5nLFxuICAgICAgICByZXNvdXJjZSxcbiAgICAgICAgb25SZWFkYWJsZUNhbGxiYWNrLFxuICAgICAgICBvbkZhaWx1cmVDYWxsYmFjayxcbiAgICAgICAgb25TdHJlYW1FcnJvclxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGF1c2VzIHBsYXliYWNrIG9mIHRoZSBjdXJyZW50IHJlc291cmNlLCBpZiBhbnkuXG4gICAqXG4gICAqIEBwYXJhbSBpbnRlcnBvbGF0ZVNpbGVuY2UgLSBJZiB0cnVlLCB0aGUgcGxheWVyIHdpbGwgcGxheSA1IHBhY2tldHMgb2Ygc2lsZW5jZSBhZnRlciBwYXVzaW5nIHRvIHByZXZlbnQgYXVkaW8gZ2xpdGNoZXNcbiAgICogQHJldHVybnMgYHRydWVgIGlmIHRoZSBwbGF5ZXIgd2FzIHN1Y2Nlc3NmdWxseSBwYXVzZWQsIG90aGVyd2lzZSBgZmFsc2VgXG4gICAqL1xuICBwdWJsaWMgcGF1c2UoaW50ZXJwb2xhdGVTaWxlbmNlID0gdHJ1ZSkge1xuICAgIGlmICh0aGlzLnN0YXRlLnN0YXR1cyAhPT0gQXVkaW9QbGF5ZXJTdGF0dXMuUGxheWluZykgcmV0dXJuIGZhbHNlO1xuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAuLi50aGlzLnN0YXRlLFxuICAgICAgc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cy5QYXVzZWQsXG4gICAgICBzaWxlbmNlUGFja2V0c1JlbWFpbmluZzogaW50ZXJwb2xhdGVTaWxlbmNlID8gNSA6IDBcbiAgICB9O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFVucGF1c2VzIHBsYXliYWNrIG9mIHRoZSBjdXJyZW50IHJlc291cmNlLCBpZiBhbnkuXG4gICAqXG4gICAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgcGxheWVyIHdhcyBzdWNjZXNzZnVsbHkgdW5wYXVzZWQsIG90aGVyd2lzZSBgZmFsc2VgXG4gICAqL1xuICBwdWJsaWMgdW5wYXVzZSgpIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5zdGF0dXMgIT09IEF1ZGlvUGxheWVyU3RhdHVzLlBhdXNlZCkgcmV0dXJuIGZhbHNlO1xuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAuLi50aGlzLnN0YXRlLFxuICAgICAgc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cy5QbGF5aW5nLFxuICAgICAgbWlzc2VkRnJhbWVzOiAwXG4gICAgfTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBwbGF5YmFjayBvZiB0aGUgY3VycmVudCByZXNvdXJjZSBhbmQgZGVzdHJveXMgdGhlIHJlc291cmNlLiBUaGUgcGxheWVyIHdpbGwgZWl0aGVyIHRyYW5zaXRpb24gdG8gdGhlIElkbGUgc3RhdGUsXG4gICAqIG9yIHJlbWFpbiBpbiBpdHMgY3VycmVudCBzdGF0ZSB1bnRpbCB0aGUgc2lsZW5jZSBwYWRkaW5nIGZyYW1lcyBvZiB0aGUgcmVzb3VyY2UgaGF2ZSBiZWVuIHBsYXllZC5cbiAgICpcbiAgICogQHBhcmFtIGZvcmNlIC0gSWYgdHJ1ZSwgd2lsbCBmb3JjZSB0aGUgcGxheWVyIHRvIGVudGVyIHRoZSBJZGxlIHN0YXRlIGV2ZW4gaWYgdGhlIHJlc291cmNlIGhhcyBzaWxlbmNlIHBhZGRpbmcgZnJhbWVzXG4gICAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgcGxheWVyIHdpbGwgY29tZSB0byBhIHN0b3AsIG90aGVyd2lzZSBgZmFsc2VgXG4gICAqL1xuICBwdWJsaWMgc3RvcChmb3JjZSA9IGZhbHNlKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuc3RhdHVzID09PSBBdWRpb1BsYXllclN0YXR1cy5JZGxlKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGZvcmNlIHx8IHRoaXMuc3RhdGUucmVzb3VyY2Uuc2lsZW5jZVBhZGRpbmdGcmFtZXMgPT09IDApIHtcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZVxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUucmVzb3VyY2Uuc2lsZW5jZVJlbWFpbmluZyA9PT0gLTEpIHtcbiAgICAgIHRoaXMuc3RhdGUucmVzb3VyY2Uuc2lsZW5jZVJlbWFpbmluZyA9XG4gICAgICB0aGlzLnN0YXRlLnJlc291cmNlLnNpbGVuY2VQYWRkaW5nRnJhbWVzO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSB1bmRlcmx5aW5nIHJlc291cmNlIChpZiBhbnkpIGlzIHBsYXlhYmxlIChyZWFkYWJsZSlcbiAgICpcbiAgICogQHJldHVybnMgYHRydWVgIGlmIHRoZSByZXNvdXJjZSBpcyBwbGF5YWJsZSwgb3RoZXJ3aXNlIGBmYWxzZWBcbiAgICovXG4gIHB1YmxpYyBjaGVja1BsYXlhYmxlKCkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5fc3RhdGU7XG4gICAgaWYgKFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZSB8fFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuQnVmZmVyaW5nKVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gSWYgdGhlIHN0cmVhbSBoYXMgYmVlbiBkZXN0cm95ZWQgb3IgaXMgbm8gbG9uZ2VyIHJlYWRhYmxlLCB0aGVuIHRyYW5zaXRpb24gdG8gdGhlIElkbGUgc3RhdGUuXG4gICAgaWYgKCFzdGF0ZS5yZXNvdXJjZS5yZWFkYWJsZSkge1xuICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cy5JZGxlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCByb3VnaGx5IGV2ZXJ5IDIwbXMgYnkgdGhlIGdsb2JhbCBhdWRpbyBwbGF5ZXIgdGltZXIuIERpc3BhdGNoZXMgYW55IGF1ZGlvIHBhY2tldHMgdGhhdCBhcmUgYnVmZmVyZWRcbiAgICogYnkgdGhlIGFjdGl2ZSBjb25uZWN0aW9ucyBvZiB0aGlzIGF1ZGlvIHBsYXllci5cbiAgICovXG4gIC8vIEB0cy1pZ25vcmVcbiAgcHJpdmF0ZSBfc3RlcERpc3BhdGNoKCkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAvLyBHdWFyZCBhZ2FpbnN0IHRoZSBJZGxlIHN0YXRlXG4gICAgaWYgKFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZSB8fFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuQnVmZmVyaW5nKVxuXG4gICAgcmV0dXJuO1xuXG4gICAgLy8gRGlzcGF0Y2ggYW55IGF1ZGlvIHBhY2tldHMgdGhhdCB3ZXJlIHByZXBhcmVkIGluIHRoZSBwcmV2aW91cyBjeWNsZVxuICAgIGZvciAoY29uc3QgY29ubmVjdGlvbiBvZiB0aGlzLnBsYXlhYmxlKSB7XG4gICAgICBjb25uZWN0aW9uLmRpc3BhdGNoQXVkaW8oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHJvdWdobHkgZXZlcnkgMjBtcyBieSB0aGUgZ2xvYmFsIGF1ZGlvIHBsYXllciB0aW1lci4gQXR0ZW1wdHMgdG8gcmVhZCBhbiBhdWRpbyBwYWNrZXQgZnJvbSB0aGVcbiAgICogdW5kZXJseWluZyByZXNvdXJjZSBvZiB0aGUgc3RyZWFtLCBhbmQgdGhlbiBoYXMgYWxsIHRoZSBhY3RpdmUgY29ubmVjdGlvbnMgb2YgdGhlIGF1ZGlvIHBsYXllciBwcmVwYXJlIGl0XG4gICAqIChlbmNyeXB0IGl0LCBhcHBlbmQgaGVhZGVyIGRhdGEpIHNvIHRoYXQgaXQgaXMgcmVhZHkgdG8gcGxheSBhdCB0aGUgc3RhcnQgb2YgdGhlIG5leHQgY3ljbGUuXG4gICAqL1xuICAvLyBAdHMtaWdub3JlXG4gIHByaXZhdGUgX3N0ZXBQcmVwYXJlKCkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5fc3RhdGU7XG5cbiAgICAvLyBHdWFyZCBhZ2FpbnN0IHRoZSBJZGxlIHN0YXRlXG4gICAgaWYgKFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuSWRsZSB8fFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuQnVmZmVyaW5nKVxuXG4gICAgcmV0dXJuO1xuXG4gICAgLy8gTGlzdCBvZiBjb25uZWN0aW9ucyB0aGF0IGNhbiByZWNlaXZlIHRoZSBwYWNrZXRcbiAgICBjb25zdCBwbGF5YWJsZSA9IHRoaXMucGxheWFibGU7XG5cbiAgICAvKiBJZiB0aGUgcGxheWVyIHdhcyBwcmV2aW91c2x5IGluIHRoZSBBdXRvUGF1c2VkIHN0YXRlLCBjaGVjayB0byBzZWUgd2hldGhlciB0aGVyZSBhcmUgbmV3bHkgYXZhaWxhYmxlXG4gICAgIGNvbm5lY3Rpb25zLCBhbGxvd2luZyB1cyB0byB0cmFuc2l0aW9uIG91dCBvZiB0aGUgQXV0b1BhdXNlZCBzdGF0ZSBiYWNrIGludG8gdGhlIFBsYXlpbmcgc3RhdGUgKi9cbiAgICBpZiAoc3RhdGUuc3RhdHVzID09PSBBdWRpb1BsYXllclN0YXR1cy5BdXRvUGF1c2VkICYmIHBsYXlhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgIC4uLnN0YXRlLFxuICAgICAgICBzdGF0dXM6IEF1ZGlvUGxheWVyU3RhdHVzLlBsYXlpbmcsXG4gICAgICAgIG1pc3NlZEZyYW1lczogMFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvKiBJZiB0aGUgcGxheWVyIGlzIChhdXRvKXBhdXNlZCwgY2hlY2sgdG8gc2VlIHdoZXRoZXIgc2lsZW5jZSBwYWNrZXRzIHNob3VsZCBiZSBwbGF5ZWQgYW5kXG4gICAgIHNldCBhIHRpbWVvdXQgdG8gYmVnaW4gdGhlIG5leHQgY3ljbGUsIGVuZGluZyB0aGUgY3VycmVudCBjeWNsZSBoZXJlLiAqL1xuICAgIGlmIChcbiAgICBzdGF0ZS5zdGF0dXMgPT09IEF1ZGlvUGxheWVyU3RhdHVzLlBhdXNlZCB8fFxuICAgIHN0YXRlLnN0YXR1cyA9PT0gQXVkaW9QbGF5ZXJTdGF0dXMuQXV0b1BhdXNlZClcbiAgICB7XG4gICAgICBpZiAoc3RhdGUuc2lsZW5jZVBhY2tldHNSZW1haW5pbmcgPiAwKSB7XG4gICAgICAgIHN0YXRlLnNpbGVuY2VQYWNrZXRzUmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3ByZXBhcmVQYWNrZXQoU0lMRU5DRV9GUkFNRSwgcGxheWFibGUsIHN0YXRlKTtcbiAgICAgICAgaWYgKHN0YXRlLnNpbGVuY2VQYWNrZXRzUmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fc2lnbmFsU3RvcFNwZWFraW5nKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgY29ubmVjdGlvbnMgaW4gdGhpcyBjeWNsZSwgb2JzZXJ2ZSB0aGUgY29uZmlndXJlZCBcIm5vIHN1YnNjcmliZXJcIiBiZWhhdmlvci5cbiAgICBpZiAocGxheWFibGUubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAodGhpcy5iZWhhdmlvcnMubm9TdWJzY3JpYmVyID09PSBOb1N1YnNjcmliZXJCZWhhdmlvci5QYXVzZSkge1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgIC4uLnN0YXRlLFxuICAgICAgICAgIHN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMuQXV0b1BhdXNlZCxcbiAgICAgICAgICBzaWxlbmNlUGFja2V0c1JlbWFpbmluZzogNVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuYmVoYXZpb3JzLm5vU3Vic2NyaWJlciA9PT0gTm9TdWJzY3JpYmVyQmVoYXZpb3IuU3RvcCkge1xuICAgICAgICB0aGlzLnN0b3AodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0ZW1wdCB0byByZWFkIGFuIE9wdXMgcGFja2V0IGZyb20gdGhlIHJlc291cmNlLiBJZiB0aGVyZSBpc24ndCBhbiBhdmFpbGFibGUgcGFja2V0LFxuICAgICAqIHBsYXkgYSBzaWxlbmNlIHBhY2tldC4gSWYgdGhlcmUgYXJlIDUgY29uc2VjdXRpdmUgY3ljbGVzIHdpdGggZmFpbGVkIHJlYWRzLCB0aGVuIHRoZVxuICAgICAqIHBsYXliYWNrIHdpbGwgZW5kLlxuICAgICAqL1xuICAgIGNvbnN0IHBhY2tldDogQnVmZmVyIHwgbnVsbCA9IHN0YXRlLnJlc291cmNlLnJlYWQoKTtcblxuICAgIGlmIChzdGF0ZS5zdGF0dXMgPT09IEF1ZGlvUGxheWVyU3RhdHVzLlBsYXlpbmcpIHtcbiAgICAgIGlmIChwYWNrZXQpIHtcbiAgICAgICAgdGhpcy5fcHJlcGFyZVBhY2tldChwYWNrZXQsIHBsYXlhYmxlLCBzdGF0ZSk7XG4gICAgICAgIHN0YXRlLm1pc3NlZEZyYW1lcyA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wcmVwYXJlUGFja2V0KFNJTEVOQ0VfRlJBTUUsIHBsYXlhYmxlLCBzdGF0ZSk7XG4gICAgICAgIHN0YXRlLm1pc3NlZEZyYW1lcysrO1xuICAgICAgICBpZiAoc3RhdGUubWlzc2VkRnJhbWVzID49IHRoaXMuYmVoYXZpb3JzLm1heE1pc3NlZEZyYW1lcykge1xuICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNpZ25hbHMgdG8gYWxsIHRoZSBzdWJzY3JpYmVkIGNvbm5lY3Rpb25zIHRoYXQgdGhleSBzaG91bGQgc2VuZCBhIHBhY2tldCB0byBEaXNjb3JkIGluZGljYXRpbmdcbiAgICogdGhleSBhcmUgbm8gbG9uZ2VyIHNwZWFraW5nLiBDYWxsZWQgb25jZSBwbGF5YmFjayBvZiBhIHJlc291cmNlIGVuZHMuXG4gICAqL1xuICBwcml2YXRlIF9zaWduYWxTdG9wU3BlYWtpbmcoKSB7XG4gICAgZm9yIChjb25zdCB7IGNvbm5lY3Rpb24gfSBvZiB0aGlzLnN1YnNjcmliZXJzKSB7XG4gICAgICBjb25uZWN0aW9uLnNldFNwZWFraW5nKGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5zdHJ1Y3RzIHRoZSBnaXZlbiBjb25uZWN0aW9ucyB0byBlYWNoIHByZXBhcmUgdGhpcyBwYWNrZXQgdG8gYmUgcGxheWVkIGF0IHRoZSBzdGFydCBvZiB0aGVcbiAgICogbmV4dCBjeWNsZS5cbiAgICpcbiAgICogQHBhcmFtIHBhY2tldCAtIFRoZSBPcHVzIHBhY2tldCB0byBiZSBwcmVwYXJlZCBieSBlYWNoIHJlY2VpdmVyXG4gICAqIEBwYXJhbSByZWNlaXZlcnMgLSBUaGUgY29ubmVjdGlvbnMgdGhhdCBzaG91bGQgcGxheSB0aGlzIHBhY2tldFxuICAgKi9cbiAgcHJpdmF0ZSBfcHJlcGFyZVBhY2tldChcbiAgcGFja2V0OiBCdWZmZXIsXG4gIHJlY2VpdmVyczogVm9pY2VDb25uZWN0aW9uW10sXG4gIHN0YXRlOiBBdWRpb1BsYXllclBhdXNlZFN0YXRlIHwgQXVkaW9QbGF5ZXJQbGF5aW5nU3RhdGUpXG4gIHtcbiAgICBzdGF0ZS5wbGF5YmFja0R1cmF0aW9uICs9IDIwO1xuICAgIGZvciAoY29uc3QgY29ubmVjdGlvbiBvZiByZWNlaXZlcnMpIHtcbiAgICAgIGNvbm5lY3Rpb24ucHJlcGFyZUF1ZGlvUGFja2V0KHBhY2tldCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBBdWRpb1BsYXllciB0byBiZSB1c2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXVkaW9QbGF5ZXIob3B0aW9ucz86IENyZWF0ZUF1ZGlvUGxheWVyT3B0aW9ucykge1xuICByZXR1cm4gbmV3IEF1ZGlvUGxheWVyKG9wdGlvbnMpO1xufSIsICIvLyBDb3B5cmlnaHQgZGlzY29yZC1wbGF5ZXIgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIExpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgZGlzY29yZC5qcyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBBcGFjaGUgTGljZW5zZSAyLjBcblxuaW1wb3J0IHR5cGUgeyBBdWRpb1Jlc291cmNlIH0gZnJvbSAnLi9BdWRpb1Jlc291cmNlJztcblxuLyoqXG4gKiBBbiBlcnJvciBlbWl0dGVkIGJ5IGFuIEF1ZGlvUGxheWVyLiBDb250YWlucyBhbiBhdHRhY2hlZCByZXNvdXJjZSB0byBhaWQgd2l0aFxuICogZGVidWdnaW5nIGFuZCBpZGVudGlmeWluZyB3aGVyZSB0aGUgZXJyb3IgY2FtZSBmcm9tLlxuICovXG5leHBvcnQgY2xhc3MgQXVkaW9QbGF5ZXJFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIFRoZSByZXNvdXJjZSBhc3NvY2lhdGVkIHdpdGggdGhlIGF1ZGlvIHBsYXllciBhdCB0aGUgdGltZSB0aGUgZXJyb3Igd2FzIHRocm93bi5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSByZXNvdXJjZTogQXVkaW9SZXNvdXJjZTtcblxuICBwdWJsaWMgY29uc3RydWN0b3IoZXJyb3I6IEVycm9yLCByZXNvdXJjZTogQXVkaW9SZXNvdXJjZSkge1xuICAgIHN1cGVyKGVycm9yLm1lc3NhZ2UpO1xuICAgIHRoaXMucmVzb3VyY2UgPSByZXNvdXJjZTtcbiAgICB0aGlzLm5hbWUgPSBlcnJvci5uYW1lO1xuICAgIHRoaXMuc3RhY2sgPSBlcnJvci5zdGFjayE7XG4gIH1cbn0iLCAiLy8gQ29weXJpZ2h0IGRpc2NvcmQtcGxheWVyIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBMaWNlbnNlLlxuLy8gQ29weXJpZ2h0IGRpc2NvcmQuanMgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gQXBhY2hlIExpY2Vuc2UgMi4wXG5cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9kb3Qtbm90YXRpb24gKi9cbmltcG9ydCB0eXBlIHsgVm9pY2VDb25uZWN0aW9uIH0gZnJvbSAnLi4vVm9pY2VDb25uZWN0aW9uJztcbmltcG9ydCB0eXBlIHsgQXVkaW9QbGF5ZXIgfSBmcm9tICcuL0F1ZGlvUGxheWVyJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc3Vic2NyaXB0aW9uIG9mIGEgdm9pY2UgY29ubmVjdGlvbiB0byBhbiBhdWRpbyBwbGF5ZXIsIGFsbG93aW5nXG4gKiB0aGUgYXVkaW8gcGxheWVyIHRvIHBsYXkgYXVkaW8gb24gdGhlIHZvaWNlIGNvbm5lY3Rpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBQbGF5ZXJTdWJzY3JpcHRpb24ge1xuICAvKipcbiAgICogVGhlIHZvaWNlIGNvbm5lY3Rpb24gb2YgdGhpcyBzdWJzY3JpcHRpb24uXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY29ubmVjdGlvbjogVm9pY2VDb25uZWN0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgYXVkaW8gcGxheWVyIG9mIHRoaXMgc3Vic2NyaXB0aW9uLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHBsYXllcjogQXVkaW9QbGF5ZXI7XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKGNvbm5lY3Rpb246IFZvaWNlQ29ubmVjdGlvbiwgcGxheWVyOiBBdWRpb1BsYXllcikge1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gIH1cblxuICAvKipcbiAgICogVW5zdWJzY3JpYmVzIHRoZSBjb25uZWN0aW9uIGZyb20gdGhlIGF1ZGlvIHBsYXllciwgbWVhbmluZyB0aGF0IHRoZVxuICAgKiBhdWRpbyBwbGF5ZXIgY2Fubm90IHN0cmVhbSBhdWRpbyB0byBpdCB1bnRpbCBhIG5ldyBzdWJzY3JpcHRpb24gaXMgbWFkZS5cbiAgICovXG4gIHB1YmxpYyB1bnN1YnNjcmliZSgpIHtcbiAgICB0aGlzLmNvbm5lY3Rpb25bJ29uU3Vic2NyaXB0aW9uUmVtb3ZlZCddKHRoaXMpO1xuICAgIHRoaXMucGxheWVyWyd1bnN1YnNjcmliZSddKHRoaXMpO1xuICB9XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1kZWNsYXJhdGlvbi1tZXJnaW5nICovXG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5pbXBvcnQgeyBjcmVhdGVTb2NrZXQsIHR5cGUgU29ja2V0IH0gZnJvbSAnbm9kZTpkZ3JhbSc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdub2RlOmV2ZW50cyc7XG5pbXBvcnQgeyBpc0lQdjQgfSBmcm9tICdub2RlOm5ldCc7XG5cbi8qKlxuICogU3RvcmVzIGFuIElQIGFkZHJlc3MgYW5kIHBvcnQuIFVzZWQgdG8gc3RvcmUgc29ja2V0IGRldGFpbHMgZm9yIHRoZSBsb2NhbCBjbGllbnQgYXMgd2VsbCBhc1xuICogZm9yIERpc2NvcmQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU29ja2V0Q29uZmlnIHtcbiAgaXA6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgcmVzcG9uc2UgZnJvbSBEaXNjb3JkIHRvIGFpZCB3aXRoIGxvY2FsIElQIGRpc2NvdmVyeS5cbiAqXG4gKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSByZWNlaXZlZCBtZXNzYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxvY2FsUGFja2V0KG1lc3NhZ2U6IEJ1ZmZlcik6IFNvY2tldENvbmZpZyB7XG4gIGNvbnN0IHBhY2tldCA9IEJ1ZmZlci5mcm9tKG1lc3NhZ2UpO1xuXG4gIGNvbnN0IGlwID0gcGFja2V0LnN1YmFycmF5KDgsIHBhY2tldC5pbmRleE9mKDAsIDgpKS50b1N0cmluZygndXRmOCcpO1xuXG4gIGlmICghaXNJUHY0KGlwKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWFsZm9ybWVkIElQIGFkZHJlc3MnKTtcbiAgfVxuXG4gIGNvbnN0IHBvcnQgPSBwYWNrZXQucmVhZFVJbnQxNkJFKHBhY2tldC5sZW5ndGggLSAyKTtcblxuICByZXR1cm4geyBpcCwgcG9ydCB9O1xufVxuXG4vKipcbiAqIFRoZSBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMgYXQgd2hpY2gga2VlcCBhbGl2ZSBkYXRhZ3JhbXMgYXJlIHNlbnQuXG4gKi9cbmNvbnN0IEtFRVBfQUxJVkVfSU5URVJWQUwgPSA1ZTM7XG5cbi8qKlxuICogVGhlIG1heGltdW0gdmFsdWUgb2YgdGhlIGtlZXAgYWxpdmUgY291bnRlci5cbiAqL1xuY29uc3QgTUFYX0NPVU5URVJfVkFMVUUgPSAyICoqIDMyIC0gMTtcblxuZXhwb3J0IGludGVyZmFjZSBWb2ljZVVEUFNvY2tldCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIG9uKGV2ZW50OiAnZXJyb3InLCBsaXN0ZW5lcjogKGVycm9yOiBFcnJvcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2xvc2UnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZGVidWcnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnbWVzc2FnZScsIGxpc3RlbmVyOiAobWVzc2FnZTogQnVmZmVyKSA9PiB2b2lkKTogdGhpcztcbn1cblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBVRFAgbmV0d29ya2luZyBmb3IgYSB2b2ljZSBjb25uZWN0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVm9pY2VVRFBTb2NrZXQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAvKipcbiAgICogVGhlIHVuZGVybHlpbmcgbmV0d29yayBTb2NrZXQgZm9yIHRoZSBWb2ljZVVEUFNvY2tldC5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgc29ja2V0OiBTb2NrZXQ7XG5cbiAgLyoqXG4gICAqIFRoZSBzb2NrZXQgZGV0YWlscyBmb3IgRGlzY29yZCAocmVtb3RlKVxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSByZW1vdGU6IFNvY2tldENvbmZpZztcblxuICAvKipcbiAgICogVGhlIGNvdW50ZXIgdXNlZCBpbiB0aGUga2VlcCBhbGl2ZSBtZWNoYW5pc20uXG4gICAqL1xuICBwcml2YXRlIGtlZXBBbGl2ZUNvdW50ZXIgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgYnVmZmVyIHVzZWQgdG8gd3JpdGUgdGhlIGtlZXAgYWxpdmUgY291bnRlciBpbnRvLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBrZWVwQWxpdmVCdWZmZXI6IEJ1ZmZlcjtcblxuICAvKipcbiAgICogVGhlIE5vZGUuanMgaW50ZXJ2YWwgZm9yIHRoZSBrZWVwLWFsaXZlIG1lY2hhbmlzbS5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkga2VlcEFsaXZlSW50ZXJ2YWw6IE5vZGVKUy5UaW1lb3V0O1xuXG4gIC8qKlxuICAgKiBUaGUgdGltZSB0YWtlbiB0byByZWNlaXZlIGEgcmVzcG9uc2UgdG8ga2VlcCBhbGl2ZSBtZXNzYWdlcy5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgVGhpcyBmaWVsZCBpcyBubyBsb25nZXIgdXBkYXRlZCBhcyBrZWVwIGFsaXZlIG1lc3NhZ2VzIGFyZSBubyBsb25nZXIgdHJhY2tlZC5cbiAgICovXG4gIHB1YmxpYyBwaW5nPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFZvaWNlVURQU29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVtb3RlIC0gRGV0YWlscyBvZiB0aGUgcmVtb3RlIHNvY2tldFxuICAgKi9cbiAgcHVibGljIGNvbnN0cnVjdG9yKHJlbW90ZTogU29ja2V0Q29uZmlnKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnNvY2tldCA9IGNyZWF0ZVNvY2tldCgndWRwNCcpO1xuICAgIHRoaXMuc29ja2V0Lm9uKCdlcnJvcicsIChlcnJvcjogRXJyb3IpID0+IHRoaXMuZW1pdCgnZXJyb3InLCBlcnJvcikpO1xuICAgIHRoaXMuc29ja2V0Lm9uKCdtZXNzYWdlJywgKGJ1ZmZlcjogQnVmZmVyKSA9PiB0aGlzLm9uTWVzc2FnZShidWZmZXIpKTtcbiAgICB0aGlzLnNvY2tldC5vbignY2xvc2UnLCAoKSA9PiB0aGlzLmVtaXQoJ2Nsb3NlJykpO1xuICAgIHRoaXMucmVtb3RlID0gcmVtb3RlO1xuICAgIHRoaXMua2VlcEFsaXZlQnVmZmVyID0gQnVmZmVyLmFsbG9jKDgpO1xuICAgIHRoaXMua2VlcEFsaXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChcbiAgICAgICgpID0+IHRoaXMua2VlcEFsaXZlKCksXG4gICAgICBLRUVQX0FMSVZFX0lOVEVSVkFMXG4gICAgKTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gdGhpcy5rZWVwQWxpdmUoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGVkIHdoZW4gYSBtZXNzYWdlIGlzIHJlY2VpdmVkIG9uIHRoZSBVRFAgc29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0gYnVmZmVyIC0gVGhlIHJlY2VpdmVkIGJ1ZmZlclxuICAgKi9cbiAgcHJpdmF0ZSBvbk1lc3NhZ2UoYnVmZmVyOiBCdWZmZXIpOiB2b2lkIHtcbiAgICAvLyBQcm9wYWdhdGUgdGhlIG1lc3NhZ2VcbiAgICB0aGlzLmVtaXQoJ21lc3NhZ2UnLCBidWZmZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBhdCBhIHJlZ3VsYXIgaW50ZXJ2YWwgdG8gY2hlY2sgd2hldGhlciB3ZSBhcmUgc3RpbGwgYWJsZSB0byBzZW5kIGRhdGFncmFtcyB0byBEaXNjb3JkLlxuICAgKi9cbiAgcHJpdmF0ZSBrZWVwQWxpdmUoKSB7XG4gICAgdGhpcy5rZWVwQWxpdmVCdWZmZXIud3JpdGVVSW50MzJMRSh0aGlzLmtlZXBBbGl2ZUNvdW50ZXIsIDApO1xuICAgIHRoaXMuc2VuZCh0aGlzLmtlZXBBbGl2ZUJ1ZmZlcik7XG4gICAgdGhpcy5rZWVwQWxpdmVDb3VudGVyKys7XG4gICAgaWYgKHRoaXMua2VlcEFsaXZlQ291bnRlciA+IE1BWF9DT1VOVEVSX1ZBTFVFKSB7XG4gICAgICB0aGlzLmtlZXBBbGl2ZUNvdW50ZXIgPSAwO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kcyBhIGJ1ZmZlciB0byBEaXNjb3JkLlxuICAgKlxuICAgKiBAcGFyYW0gYnVmZmVyIC0gVGhlIGJ1ZmZlciB0byBzZW5kXG4gICAqL1xuICBwdWJsaWMgc2VuZChidWZmZXI6IEJ1ZmZlcikge1xuICAgIHRoaXMuc29ja2V0LnNlbmQoYnVmZmVyLCB0aGlzLnJlbW90ZS5wb3J0LCB0aGlzLnJlbW90ZS5pcCk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBzb2NrZXQsIHRoZSBpbnN0YW5jZSB3aWxsIG5vdCBiZSBhYmxlIHRvIGJlIHJldXNlZC5cbiAgICovXG4gIHB1YmxpYyBkZXN0cm95KCkge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnNvY2tldC5jbG9zZSgpO1xuICAgIH0gY2F0Y2gge1xuXG4gICAgICAvL1xuICAgIH1cbiAgICBjbGVhckludGVydmFsKHRoaXMua2VlcEFsaXZlSW50ZXJ2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm1zIElQIGRpc2NvdmVyeSB0byBkaXNjb3ZlciB0aGUgbG9jYWwgYWRkcmVzcyBhbmQgcG9ydCB0byBiZSB1c2VkIGZvciB0aGUgdm9pY2UgY29ubmVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNzcmMgLSBUaGUgU1NSQyByZWNlaXZlZCBmcm9tIERpc2NvcmRcbiAgICovXG4gIHB1YmxpYyBhc3luYyBwZXJmb3JtSVBEaXNjb3Zlcnkoc3NyYzogbnVtYmVyKTogUHJvbWlzZTxTb2NrZXRDb25maWc+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgbGlzdGVuZXIgPSAobWVzc2FnZTogQnVmZmVyKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKG1lc3NhZ2UucmVhZFVJbnQxNkJFKDApICE9PSAyKSByZXR1cm47XG4gICAgICAgICAgY29uc3QgcGFja2V0ID0gcGFyc2VMb2NhbFBhY2tldChtZXNzYWdlKTtcbiAgICAgICAgICB0aGlzLnNvY2tldC5vZmYoJ21lc3NhZ2UnLCBsaXN0ZW5lcik7XG4gICAgICAgICAgcmVzb2x2ZShwYWNrZXQpO1xuICAgICAgICB9IGNhdGNoIHtcblxuICAgICAgICAgIC8vXG4gICAgICAgIH19O1xuXG4gICAgICB0aGlzLnNvY2tldC5vbignbWVzc2FnZScsIGxpc3RlbmVyKTtcbiAgICAgIHRoaXMuc29ja2V0Lm9uY2UoJ2Nsb3NlJywgKCkgPT5cbiAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0Nhbm5vdCBwZXJmb3JtIElQIGRpc2NvdmVyeSAtIHNvY2tldCBjbG9zZWQnKSlcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGRpc2NvdmVyeUJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyg3NCk7XG5cbiAgICAgIGRpc2NvdmVyeUJ1ZmZlci53cml0ZVVJbnQxNkJFKDEsIDApO1xuICAgICAgZGlzY292ZXJ5QnVmZmVyLndyaXRlVUludDE2QkUoNzAsIDIpO1xuICAgICAgZGlzY292ZXJ5QnVmZmVyLndyaXRlVUludDMyQkUoc3NyYywgNCk7XG4gICAgICB0aGlzLnNlbmQoZGlzY292ZXJ5QnVmZmVyKTtcbiAgICB9KTtcbiAgfVxufSIsICIvLyBDb3B5cmlnaHQgZGlzY29yZC1wbGF5ZXIgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIExpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgZGlzY29yZC5qcyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBBcGFjaGUgTGljZW5zZSAyLjBcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1kZWNsYXJhdGlvbi1tZXJnaW5nICovXG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdub2RlOmV2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IFZvaWNlU2VuZFBheWxvYWQgfSBmcm9tICdkaXNjb3JkLWFwaS10eXBlcy92b2ljZS92OCc7XG5pbXBvcnQgeyBWb2ljZU9wY29kZXMgfSBmcm9tICdkaXNjb3JkLWFwaS10eXBlcy92b2ljZS92OCc7XG5pbXBvcnQgV2ViU29ja2V0LCB7IHR5cGUgTWVzc2FnZUV2ZW50IH0gZnJvbSAnd3MnO1xuaW1wb3J0IHsgdW5zYWZlIH0gZnJvbSAnLi4vY29tbW9uL3R5cGVzJztcblxuLyoqXG4gKiBBIGJpbmFyeSBXZWJTb2NrZXQgbWVzc2FnZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCaW5hcnlXZWJTb2NrZXRNZXNzYWdlIHtcbiAgb3A6IFZvaWNlT3Bjb2RlcztcbiAgcGF5bG9hZDogQnVmZmVyO1xuICBzZXE6IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWb2ljZVdlYlNvY2tldCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIG9uKGV2ZW50OiAnZXJyb3InLCBsaXN0ZW5lcjogKGVycm9yOiBFcnJvcikgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnb3BlbicsIGxpc3RlbmVyOiAoZXZlbnQ6IFdlYlNvY2tldC5FdmVudCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2xvc2UnLCBsaXN0ZW5lcjogKGV2ZW50OiBXZWJTb2NrZXQuQ2xvc2VFdmVudCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8qKlxuICAgKiBEZWJ1ZyBldmVudCBmb3IgVm9pY2VXZWJTb2NrZXQuXG4gICAqXG4gICAqIEBldmVudFByb3BlcnR5XG4gICAqL1xuICBvbihldmVudDogJ2RlYnVnJywgbGlzdGVuZXI6IChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzO1xuICAvKipcbiAgICogUGFja2V0IGV2ZW50LlxuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb24oZXZlbnQ6ICdwYWNrZXQnLCBsaXN0ZW5lcjogKHBhY2tldDogdW5zYWZlKSA9PiB2b2lkKTogdGhpcztcbiAgLyoqXG4gICAqIEJpbmFyeSBtZXNzYWdlIGV2ZW50LlxuICAgKlxuICAgKiBAZXZlbnRQcm9wZXJ0eVxuICAgKi9cbiAgb24oXG4gIGV2ZW50OiAnYmluYXJ5JyxcbiAgbGlzdGVuZXI6IChtZXNzYWdlOiBCaW5hcnlXZWJTb2NrZXRNZXNzYWdlKSA9PiB2b2lkKVxuICA6IHRoaXM7XG59XG5cbi8qKlxuICogQW4gZXh0ZW5zaW9uIG9mIHRoZSBXZWJTb2NrZXQgY2xhc3MgdG8gcHJvdmlkZSBoZWxwZXIgZnVuY3Rpb25hbGl0eSB3aGVuIGludGVyYWN0aW5nXG4gKiB3aXRoIHRoZSBEaXNjb3JkIFZvaWNlIGdhdGV3YXkuXG4gKi9cbmV4cG9ydCBjbGFzcyBWb2ljZVdlYlNvY2tldCBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBoZWFydGJlYXQgaW50ZXJ2YWwsIGlmIGFueS5cbiAgICovXG4gIHByaXZhdGUgaGVhcnRiZWF0SW50ZXJ2YWw/OiBOb2RlSlMuVGltZW91dDtcblxuICAvKipcbiAgICogVGhlIHRpbWUgKG1pbGxpc2Vjb25kcyBzaW5jZSBVTklYIGVwb2NoKSB0aGF0IHRoZSBsYXN0IGhlYXJ0YmVhdCBhY2tub3dsZWRnZW1lbnQgcGFja2V0IHdhcyByZWNlaXZlZC5cbiAgICogVGhpcyBpcyBzZXQgdG8gMCBpZiBhbiBhY2tub3dsZWRnZW1lbnQgcGFja2V0IGhhc24ndCBiZWVuIHJlY2VpdmVkIHlldC5cbiAgICovXG4gIHByaXZhdGUgbGFzdEhlYXJ0YmVhdEFjazogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgdGltZSAobWlsbGlzZWNvbmRzIHNpbmNlIFVOSVggZXBvY2gpIHRoYXQgdGhlIGxhc3QgaGVhcnRiZWF0IHdhcyBzZW50LiBUaGlzIGlzIHNldCB0byAwIGlmIGEgaGVhcnRiZWF0XG4gICAqIGhhc24ndCBiZWVuIHNlbnQgeWV0LlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0SGVhcnRiZWF0U2VuZDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIGNvbnNlY3V0aXZlbHkgbWlzc2VkIGhlYXJ0YmVhdHMuXG4gICAqL1xuICBwcml2YXRlIG1pc3NlZEhlYXJ0YmVhdHMgPSAwO1xuXG4gIC8qKlxuICAgKiBUaGUgbGFzdCByZWNvcmRlZCBwaW5nLlxuICAgKi9cbiAgcHVibGljIHBpbmc/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBsYXN0IHNlcXVlbmNlIG51bWJlciBhY2tub3dsZWRnZWQgZnJvbSBEaXNjb3JkLiBXaWxsIGJlIGAtMWAgaWYgbm8gc2VxdWVuY2UgbnVtYmVyZWQgbWVzc2FnZXMgaGF2ZSBiZWVuIHJlY2VpdmVkLlxuICAgKi9cbiAgcHVibGljIHNlcXVlbmNlID0gLTE7XG5cbiAgLyoqXG4gICAqIFRoZSBkZWJ1ZyBsb2dnZXIgZnVuY3Rpb24sIGlmIGRlYnVnZ2luZyBpcyBlbmFibGVkLlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBkZWJ1ZzogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbDtcblxuICAvKipcbiAgICogVGhlIHVuZGVybHlpbmcgV2ViU29ja2V0IG9mIHRoaXMgd3JhcHBlci5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgd3M6IFdlYlNvY2tldDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBWb2ljZVdlYlNvY2tldC5cbiAgICpcbiAgICogQHBhcmFtIGFkZHJlc3MgLSBUaGUgYWRkcmVzcyB0byBjb25uZWN0IHRvXG4gICAqL1xuICBwdWJsaWMgY29uc3RydWN0b3IoYWRkcmVzczogc3RyaW5nLCBkZWJ1ZzogYm9vbGVhbikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXQoYWRkcmVzcyk7XG4gICAgdGhpcy53cy5vbm1lc3NhZ2UgPSAoZXJyKSA9PiB0aGlzLm9uTWVzc2FnZShlcnIpO1xuICAgIHRoaXMud3Mub25vcGVuID0gKGVycikgPT4gdGhpcy5lbWl0KCdvcGVuJywgZXJyKTtcbiAgICB0aGlzLndzLm9uZXJyb3IgPSAoZXJyOiBFcnJvciB8IFdlYlNvY2tldC5FcnJvckV2ZW50KSA9PlxuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyciA6IGVyci5lcnJvcik7XG4gICAgdGhpcy53cy5vbmNsb3NlID0gKGVycikgPT4gdGhpcy5lbWl0KCdjbG9zZScsIGVycik7XG5cbiAgICB0aGlzLmxhc3RIZWFydGJlYXRBY2sgPSAwO1xuICAgIHRoaXMubGFzdEhlYXJ0YmVhdFNlbmQgPSAwO1xuXG4gICAgdGhpcy5kZWJ1ZyA9IGRlYnVnID9cbiAgICAobWVzc2FnZTogc3RyaW5nKSA9PiB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSkgOlxuICAgIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIFZvaWNlV2ViU29ja2V0LiBUaGUgaGVhcnRiZWF0IGludGVydmFsIGlzIGNsZWFyZWQsIGFuZCB0aGUgY29ubmVjdGlvbiBpcyBjbG9zZWQuXG4gICAqL1xuICBwdWJsaWMgZGVzdHJveSgpIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5kZWJ1Zz8uKCdkZXN0cm95ZWQnKTtcbiAgICAgIHRoaXMuc2V0SGVhcnRiZWF0SW50ZXJ2YWwoLTEpO1xuICAgICAgdGhpcy53cy5jbG9zZSgxXzAwMCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgbWVzc2FnZSBldmVudHMgb24gdGhlIFdlYlNvY2tldC4gQXR0ZW1wdHMgdG8gSlNPTiBwYXJzZSB0aGUgbWVzc2FnZXMgYW5kIGVtaXQgdGhlbVxuICAgKiBhcyBwYWNrZXRzLiBCaW5hcnkgbWVzc2FnZXMgd2lsbCBiZSBwYXJzZWQgYW5kIGVtaXR0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBtZXNzYWdlIGV2ZW50XG4gICAqL1xuICBwdWJsaWMgb25NZXNzYWdlKGV2ZW50OiBNZXNzYWdlRXZlbnQpIHtcbiAgICBpZiAoZXZlbnQuZGF0YSBpbnN0YW5jZW9mIEJ1ZmZlciB8fCBldmVudC5kYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9XG4gICAgICBldmVudC5kYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgP1xuICAgICAgQnVmZmVyLmZyb20oZXZlbnQuZGF0YSkgOlxuICAgICAgZXZlbnQuZGF0YTtcbiAgICAgIGNvbnN0IHNlcSA9IGJ1ZmZlci5yZWFkVUludDE2QkUoMCk7XG4gICAgICBjb25zdCBvcCA9IGJ1ZmZlci5yZWFkVUludDgoMik7XG4gICAgICBjb25zdCBwYXlsb2FkID0gYnVmZmVyLnN1YmFycmF5KDMpO1xuXG4gICAgICB0aGlzLnNlcXVlbmNlID0gc2VxO1xuICAgICAgdGhpcy5kZWJ1Zz8uKFxuICAgICAgICBgPDwgW2Jpbl0gb3Bjb2RlICR7b3B9LCBzZXEgJHtzZXF9LCAke3BheWxvYWQuYnl0ZUxlbmd0aH0gYnl0ZXNgXG4gICAgICApO1xuXG4gICAgICB0aGlzLmVtaXQoJ2JpbmFyeScsIHsgb3AsIHNlcSwgcGF5bG9hZCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBldmVudC5kYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZGVidWc/LihgPDwgJHtldmVudC5kYXRhfWApO1xuXG4gICAgbGV0IHBhY2tldDogdW5zYWZlO1xuICAgIHRyeSB7XG4gICAgICBwYWNrZXQgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChwYWNrZXQuc2VxKSB7XG4gICAgICB0aGlzLnNlcXVlbmNlID0gcGFja2V0LnNlcTtcbiAgICB9XG5cbiAgICBpZiAocGFja2V0Lm9wID09PSBWb2ljZU9wY29kZXMuSGVhcnRiZWF0QWNrKSB7XG4gICAgICB0aGlzLmxhc3RIZWFydGJlYXRBY2sgPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5taXNzZWRIZWFydGJlYXRzID0gMDtcbiAgICAgIHRoaXMucGluZyA9IHRoaXMubGFzdEhlYXJ0YmVhdEFjayAtIHRoaXMubGFzdEhlYXJ0YmVhdFNlbmQ7XG4gICAgfVxuXG4gICAgdGhpcy5lbWl0KCdwYWNrZXQnLCBwYWNrZXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgSlNPTi1zdHJpbmdpZmlhYmxlIHBhY2tldCBvdmVyIHRoZSBXZWJTb2NrZXQuXG4gICAqXG4gICAqIEBwYXJhbSBwYWNrZXQgLSBUaGUgcGFja2V0IHRvIHNlbmRcbiAgICovXG4gIHB1YmxpYyBzZW5kUGFja2V0KHBhY2tldDogVm9pY2VTZW5kUGF5bG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdHJpbmdpZmllZCA9IEpTT04uc3RyaW5naWZ5KHBhY2tldCk7XG4gICAgICB0aGlzLmRlYnVnPy4oYD4+ICR7c3RyaW5naWZpZWR9YCk7XG4gICAgICB0aGlzLndzLnNlbmQoc3RyaW5naWZpZWQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnIgPSBlcnJvciBhcyBFcnJvcjtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kcyBhIGJpbmFyeSBtZXNzYWdlIG92ZXIgdGhlIFdlYlNvY2tldC5cbiAgICpcbiAgICogQHBhcmFtIG9wY29kZSAtIFRoZSBvcGNvZGUgdG8gdXNlXG4gICAqIEBwYXJhbSBwYXlsb2FkIC0gVGhlIHBheWxvYWQgdG8gc2VuZFxuICAgKi9cbiAgcHVibGljIHNlbmRCaW5hcnlNZXNzYWdlKG9wY29kZTogVm9pY2VPcGNvZGVzLCBwYXlsb2FkOiBCdWZmZXIpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IEJ1ZmZlci5jb25jYXQoW25ldyBVaW50OEFycmF5KFtvcGNvZGVdKSwgcGF5bG9hZF0pO1xuICAgICAgdGhpcy5kZWJ1Zz8uKGA+PiBbYmluXSBvcGNvZGUgJHtvcGNvZGV9LCAke3BheWxvYWQuYnl0ZUxlbmd0aH0gYnl0ZXNgKTtcbiAgICAgIHRoaXMud3Muc2VuZChtZXNzYWdlKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2VuZHMgYSBoZWFydGJlYXQgb3ZlciB0aGUgV2ViU29ja2V0LlxuICAgKi9cbiAgcHJpdmF0ZSBzZW5kSGVhcnRiZWF0KCkge1xuICAgIHRoaXMubGFzdEhlYXJ0YmVhdFNlbmQgPSBEYXRlLm5vdygpO1xuICAgIHRoaXMubWlzc2VkSGVhcnRiZWF0cysrO1xuICAgIGNvbnN0IG5vbmNlID0gdGhpcy5sYXN0SGVhcnRiZWF0U2VuZDtcbiAgICB0aGlzLnNlbmRQYWNrZXQoe1xuICAgICAgb3A6IFZvaWNlT3Bjb2Rlcy5IZWFydGJlYXQsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaWQtbGVuZ3RoXG4gICAgICBkOiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBpZC1sZW5ndGhcbiAgICAgICAgdDogbm9uY2UsXG4gICAgICAgIHNlcV9hY2s6IHRoaXMuc2VxdWVuY2VcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzL2NsZWFycyBhbiBpbnRlcnZhbCB0byBzZW5kIGhlYXJ0YmVhdHMgb3ZlciB0aGUgV2ViU29ja2V0LlxuICAgKlxuICAgKiBAcGFyYW0gbXMgLSBUaGUgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzLiBJZiBuZWdhdGl2ZSwgdGhlIGludGVydmFsIHdpbGwgYmUgdW5zZXRcbiAgICovXG4gIHB1YmxpYyBzZXRIZWFydGJlYXRJbnRlcnZhbChtczogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuaGVhcnRiZWF0SW50ZXJ2YWwgIT09IHVuZGVmaW5lZClcbiAgICBjbGVhckludGVydmFsKHRoaXMuaGVhcnRiZWF0SW50ZXJ2YWwpO1xuICAgIGlmIChtcyA+IDApIHtcbiAgICAgIHRoaXMuaGVhcnRiZWF0SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmxhc3RIZWFydGJlYXRTZW5kICE9PSAwICYmIHRoaXMubWlzc2VkSGVhcnRiZWF0cyA+PSAzKSB7XG4gICAgICAgICAgLy8gTWlzc2VkIHRvbyBtYW55IGhlYXJ0YmVhdHMgLSBkaXNjb25uZWN0XG4gICAgICAgICAgdGhpcy53cy5jbG9zZSgpO1xuICAgICAgICAgIHRoaXMuc2V0SGVhcnRiZWF0SW50ZXJ2YWwoLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZW5kSGVhcnRiZWF0KCk7XG4gICAgICB9LCBtcyk7XG4gICAgfVxuICB9XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuaW1wb3J0IHR5cGUgeyBKb2luQ29uZmlnIH0gZnJvbSAnLi9EYXRhU3RvcmUnO1xuaW1wb3J0IHsgY3JlYXRlVm9pY2VDb25uZWN0aW9uIH0gZnJvbSAnLi9Wb2ljZUNvbm5lY3Rpb24nO1xuaW1wb3J0IHR5cGUgeyBEaXNjb3JkR2F0ZXdheUFkYXB0ZXJDcmVhdG9yIH0gZnJvbSAnLi91dGlsL2FkYXB0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRoYXQgY2FuIGJlIGdpdmVuIHdoZW4gY3JlYXRpbmcgYSB2b2ljZSBjb25uZWN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVZvaWNlQ29ubmVjdGlvbk9wdGlvbnMge1xuICBhZGFwdGVyQ3JlYXRvcjogRGlzY29yZEdhdGV3YXlBZGFwdGVyQ3JlYXRvcjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgdGhlIERBVkUgcHJvdG9jb2wgZm9yIGVuZC10by1lbmQgZW5jcnlwdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIGRhdmVFbmNyeXB0aW9uPzogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSWYgdHJ1ZSwgZGVidWcgbWVzc2FnZXMgd2lsbCBiZSBlbmFibGVkIGZvciB0aGUgdm9pY2UgY29ubmVjdGlvbiBhbmQgaXRzXG4gICAqIHJlbGF0ZWQgY29tcG9uZW50cy4gRGVmYXVsdHMgdG8gZmFsc2UuXG4gICAqL1xuICBkZWJ1Zz86IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFRoZSBhbW91bnQgb2YgY29uc2VjdXRpdmUgZGVjcnlwdGlvbiBmYWlsdXJlcyBuZWVkZWQgdG8gdHJ5IHRvXG4gICAqIHJlLWluaXRpYWxpemUgdGhlIGVuZC10by1lbmQgZW5jcnlwdGVkIHNlc3Npb24gdG8gcmVjb3Zlci4gRGVmYXVsdHMgdG8gMjQuXG4gICAqL1xuICBkZWNyeXB0aW9uRmFpbHVyZVRvbGVyYW5jZT86IG51bWJlciB8IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0aGF0IGNhbiBiZSBnaXZlbiB3aGVuIGpvaW5pbmcgYSB2b2ljZSBjaGFubmVsLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEpvaW5Wb2ljZUNoYW5uZWxPcHRpb25zIHtcbiAgLyoqXG4gICAqIFRoZSBpZCBvZiB0aGUgRGlzY29yZCB2b2ljZSBjaGFubmVsIHRvIGpvaW4uXG4gICAqL1xuICBjaGFubmVsSWQ6IHN0cmluZztcblxuICAvKipcbiAgICogQW4gb3B0aW9uYWwgZ3JvdXAgaWRlbnRpZmllciBmb3IgdGhlIHZvaWNlIGNvbm5lY3Rpb24uXG4gICAqL1xuICBncm91cD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGlkIG9mIHRoZSBndWlsZCB0aGF0IHRoZSB2b2ljZSBjaGFubmVsIGJlbG9uZ3MgdG8uXG4gICAqL1xuICBndWlsZElkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gam9pbiB0aGUgY2hhbm5lbCBkZWFmZW5lZCAoZGVmYXVsdHMgdG8gdHJ1ZSlcbiAgICovXG4gIHNlbGZEZWFmPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBqb2luIHRoZSBjaGFubmVsIG11dGVkIChkZWZhdWx0cyB0byB0cnVlKVxuICAgKi9cbiAgc2VsZk11dGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBWb2ljZUNvbm5lY3Rpb24gdG8gYSBEaXNjb3JkIHZvaWNlIGNoYW5uZWwuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgLSB0aGUgb3B0aW9ucyBmb3Igam9pbmluZyB0aGUgdm9pY2UgY2hhbm5lbFxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pblZvaWNlQ2hhbm5lbChcbm9wdGlvbnM6IENyZWF0ZVZvaWNlQ29ubmVjdGlvbk9wdGlvbnMgJiBKb2luVm9pY2VDaGFubmVsT3B0aW9ucylcbntcbiAgY29uc3Qgam9pbkNvbmZpZzogSm9pbkNvbmZpZyA9IHtcbiAgICBzZWxmRGVhZjogdHJ1ZSxcbiAgICBzZWxmTXV0ZTogZmFsc2UsXG4gICAgZ3JvdXA6ICdkZWZhdWx0JyxcbiAgICAuLi5vcHRpb25zXG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZVZvaWNlQ29ubmVjdGlvbihqb2luQ29uZmlnLCB7XG4gICAgYWRhcHRlckNyZWF0b3I6IG9wdGlvbnMuYWRhcHRlckNyZWF0b3IsXG4gICAgZGVidWc6IG9wdGlvbnMuZGVidWcsXG4gICAgZGF2ZUVuY3J5cHRpb246IG9wdGlvbnMuZGF2ZUVuY3J5cHRpb24sXG4gICAgZGVjcnlwdGlvbkZhaWx1cmVUb2xlcmFuY2U6IG9wdGlvbnMuZGVjcnlwdGlvbkZhaWx1cmVUb2xlcmFuY2VcbiAgfSk7XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG5pbXBvcnQgdHlwZSB7IEJ1ZmZlciB9IGZyb20gJ25vZGU6YnVmZmVyJztcbmltcG9ydCB7IHBpcGVsaW5lLCB0eXBlIFJlYWRhYmxlIH0gZnJvbSAnbm9kZTpzdHJlYW0nO1xuaW1wb3J0IHsgbm9vcCB9IGZyb20gJy4uL3V0aWwvdXRpbCc7XG5pbXBvcnQgeyBTSUxFTkNFX0ZSQU1FLCB0eXBlIEF1ZGlvUGxheWVyIH0gZnJvbSAnLi9BdWRpb1BsYXllcic7XG5pbXBvcnQge1xuICBmaW5kUGlwZWxpbmUsXG4gIFN0cmVhbVR5cGUsXG4gIFRyYW5zZm9ybWVyVHlwZSxcbiAgdHlwZSBFZGdlIH0gZnJvbVxuJy4vVHJhbnNmb3JtZXJHcmFwaCc7XG5pbXBvcnQge1xuICBPZ2dEZW11eGVyLFxuICBPcHVzRGVjb2RlcixcbiAgT3B1c0VuY29kZXIsXG4gIFdlYm1EZW11eGVyIH0gZnJvbVxuJ0BkaXNjb3JkLXBsYXllci9vcHVzJztcbmltcG9ydCB7IFZvbHVtZVRyYW5zZm9ybWVyIH0gZnJvbSAnQGRpc2NvcmQtcGxheWVyL2VxdWFsaXplcic7XG5cbi8qKlxuICogT3B0aW9ucyB0aGF0IGFyZSBzZXQgd2hlbiBjcmVhdGluZyBhIG5ldyBhdWRpbyByZXNvdXJjZS5cbiAqXG4gKiBAdHlwZVBhcmFtIE1ldGFkYXRhIC0gdGhlIHR5cGUgZm9yIHRoZSBtZXRhZGF0YSAoaWYgYW55KSBvZiB0aGUgYXVkaW8gcmVzb3VyY2VcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVBdWRpb1Jlc291cmNlT3B0aW9uczxNZXRhZGF0YT4ge1xuICAvKipcbiAgICogV2hldGhlciBvciBub3QgaW5saW5lIHZvbHVtZSBzaG91bGQgYmUgZW5hYmxlZC4gSWYgZW5hYmxlZCwgeW91IHdpbGwgYmUgYWJsZSB0byBjaGFuZ2UgdGhlIHZvbHVtZVxuICAgKiBvZiB0aGUgc3RyZWFtIG9uLXRoZS1mbHkuIEhvd2V2ZXIsIHRoaXMgYWxzbyBpbmNyZWFzZXMgdGhlIHBlcmZvcm1hbmNlIGNvc3Qgb2YgcGxheWJhY2suIERlZmF1bHRzIHRvIGBmYWxzZWAuXG4gICAqL1xuICBpbmxpbmVWb2x1bWU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiB0aGUgaW5wdXQgc3RyZWFtLiBEZWZhdWx0cyB0byBgU3RyZWFtVHlwZS5BcmJpdHJhcnlgLlxuICAgKi9cbiAgaW5wdXRUeXBlPzogU3RyZWFtVHlwZTtcblxuICAvKipcbiAgICogT3B0aW9uYWwgbWV0YWRhdGEgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIHJlc291cmNlIChlLmcuIHRyYWNrIHRpdGxlLCByYW5kb20gaWQpLlxuICAgKiBUaGlzIGlzIHVzZWZ1bCBmb3IgaWRlbnRpZmljYXRpb24gcHVycG9zZXMgd2hlbiB0aGUgcmVzb3VyY2UgaXMgcGFzc2VkIGFyb3VuZCBpbiBldmVudHMuXG4gICAqIFNlZSB7QGxpbmsgQXVkaW9SZXNvdXJjZS5tZXRhZGF0YX1cbiAgICovXG4gIG1ldGFkYXRhPzogTWV0YWRhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2Ygc2lsZW5jZSBmcmFtZXMgdG8gYXBwZW5kIHRvIHRoZSBlbmQgb2YgdGhlIHJlc291cmNlJ3MgYXVkaW8gc3RyZWFtLCB0byBwcmV2ZW50IGludGVycG9sYXRpb24gZ2xpdGNoZXMuXG4gICAqIERlZmF1bHRzIHRvIDUuXG4gICAqL1xuICBzaWxlbmNlUGFkZGluZ0ZyYW1lcz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGF1ZGlvIHJlc291cmNlIHRoYXQgY2FuIGJlIHBsYXllZCBieSBhbiBhdWRpbyBwbGF5ZXIuXG4gKlxuICogQHR5cGVQYXJhbSBNZXRhZGF0YSAtIHRoZSB0eXBlIGZvciB0aGUgbWV0YWRhdGEgKGlmIGFueSkgb2YgdGhlIGF1ZGlvIHJlc291cmNlXG4gKi9cbmV4cG9ydCBjbGFzcyBBdWRpb1Jlc291cmNlPE1ldGFkYXRhID0gdW5rbm93bj4ge1xuICAvKipcbiAgICogQW4gb2JqZWN0LW1vZGUgUmVhZGFibGUgc3RyZWFtIHRoYXQgZW1pdHMgT3B1cyBwYWNrZXRzLiBUaGlzIGlzIHdoYXQgaXMgcGxheWVkIGJ5IGF1ZGlvIHBsYXllcnMuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcGxheVN0cmVhbTogUmVhZGFibGU7XG5cbiAgLyoqXG4gICAqIFRoZSBwaXBlbGluZSB1c2VkIHRvIGNvbnZlcnQgdGhlIGlucHV0IHN0cmVhbSBpbnRvIGEgcGxheWFibGUgZm9ybWF0LiBGb3IgZXhhbXBsZSwgdGhpcyBtYXlcbiAgICogY29udGFpbiBhbiBGRm1wZWcgY29tcG9uZW50IGZvciBhcmJpdHJhcnkgaW5wdXRzLCBhbmQgaXQgbWF5IGNvbnRhaW4gYSBWb2x1bWVUcmFuc2Zvcm1lciBjb21wb25lbnRcbiAgICogZm9yIHJlc291cmNlcyB3aXRoIGlubGluZSB2b2x1bWUgdHJhbnNmb3JtYXRpb24gZW5hYmxlZC5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBlZGdlczogcmVhZG9ubHkgRWRnZVtdO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCBtZXRhZGF0YSB0aGF0IGNhbiBiZSB1c2VkIHRvIGlkZW50aWZ5IHRoZSByZXNvdXJjZS5cbiAgICovXG4gIHB1YmxpYyBtZXRhZGF0YTogTWV0YWRhdGE7XG5cbiAgLyoqXG4gICAqIElmIHRoZSByZXNvdXJjZSB3YXMgY3JlYXRlZCB3aXRoIGlubGluZSB2b2x1bWUgdHJhbnNmb3JtYXRpb24gZW5hYmxlZCwgdGhlbiB0aGlzIHdpbGwgYmUgYVxuICAgKiBgQGRpc2NvcmQtcGxheWVyL2VxdWFsaXplcmAgVm9sdW1lVHJhbnNmb3JtZXIuIFlvdSBjYW4gdXNlIHRoaXMgdG8gYWx0ZXIgdGhlIHZvbHVtZSBvZiB0aGUgc3RyZWFtLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHZvbHVtZT86IFZvbHVtZVRyYW5zZm9ybWVyO1xuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBhbiBPcHVzIGVuY29kZXIgdG8gY3JlYXRlIHRoaXMgYXVkaW8gcmVzb3VyY2UsIHRoZW4gdGhpcyB3aWxsIGJlIGFgQGRpc2NvcmQtcGxheWVyL29wdXNgIG9wdXMuRW5jb2Rlci5cbiAgICogWW91IGNhbiB1c2UgdGhpcyB0byBjb250cm9sIHNldHRpbmdzIHN1Y2ggYXMgYml0cmF0ZSwgRkVDLCBQTFAuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZW5jb2Rlcj86IE9wdXNFbmNvZGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgYXVkaW8gcGxheWVyIHRoYXQgdGhlIHJlc291cmNlIGlzIHN1YnNjcmliZWQgdG8sIGlmIGFueS5cbiAgICovXG4gIHB1YmxpYyBhdWRpb1BsYXllcj86IEF1ZGlvUGxheWVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgcGxheWJhY2sgZHVyYXRpb24gb2YgdGhpcyBhdWRpbyByZXNvdXJjZSwgZ2l2ZW4gaW4gbWlsbGlzZWNvbmRzLlxuICAgKi9cbiAgcHVibGljIHBsYXliYWNrRHVyYXRpb24gPSAwO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB0aGUgc3RyZWFtIGZvciB0aGlzIHJlc291cmNlIGhhcyBzdGFydGVkIChkYXRhIGhhcyBiZWNvbWUgcmVhZGFibGUpXG4gICAqL1xuICBwdWJsaWMgc3RhcnRlZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIHNpbGVuY2UgZnJhbWVzIHRvIGFwcGVuZCB0byB0aGUgZW5kIG9mIHRoZSByZXNvdXJjZSdzIGF1ZGlvIHN0cmVhbSwgdG8gcHJldmVudCBpbnRlcnBvbGF0aW9uIGdsaXRjaGVzLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHNpbGVuY2VQYWRkaW5nRnJhbWVzOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgcmVtYWluaW5nIHNpbGVuY2UgZnJhbWVzIHRvIHBsYXkuIElmIC0xLCB0aGUgZnJhbWVzIGhhdmUgbm90IHlldCBzdGFydGVkIHBsYXlpbmcuXG4gICAqL1xuICBwdWJsaWMgc2lsZW5jZVJlbWFpbmluZyA9IC0xO1xuXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgZWRnZXM6IHJlYWRvbmx5IEVkZ2VbXSxcbiAgc3RyZWFtczogcmVhZG9ubHkgUmVhZGFibGVbXSxcbiAgbWV0YWRhdGE6IE1ldGFkYXRhLFxuICBzaWxlbmNlUGFkZGluZ0ZyYW1lczogbnVtYmVyKVxuICB7XG4gICAgdGhpcy5lZGdlcyA9IGVkZ2VzO1xuICAgIHRoaXMucGxheVN0cmVhbSA9XG4gICAgc3RyZWFtcy5sZW5ndGggPiAxID9cbiAgICBwaXBlbGluZShzdHJlYW1zLCBub29wKSBhcyB1bmtub3duIGFzIFJlYWRhYmxlIDpcbiAgICBzdHJlYW1zWzBdITtcbiAgICB0aGlzLm1ldGFkYXRhID0gbWV0YWRhdGE7XG4gICAgdGhpcy5zaWxlbmNlUGFkZGluZ0ZyYW1lcyA9IHNpbGVuY2VQYWRkaW5nRnJhbWVzO1xuXG4gICAgZm9yIChjb25zdCBzdHJlYW0gb2Ygc3RyZWFtcykge1xuICAgICAgaWYgKHN0cmVhbSBpbnN0YW5jZW9mIFZvbHVtZVRyYW5zZm9ybWVyKSB7XG4gICAgICAgIHRoaXMudm9sdW1lID0gc3RyZWFtO1xuICAgICAgfSBlbHNlIGlmIChzdHJlYW0gaW5zdGFuY2VvZiBPcHVzRW5jb2Rlcikge1xuICAgICAgICB0aGlzLmVuY29kZXIgPSBzdHJlYW07XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5wbGF5U3RyZWFtLm9uY2UoJ3JlYWRhYmxlJywgKCkgPT4gdGhpcy5zdGFydGVkID0gdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogV2hldGhlciB0aGlzIHJlc291cmNlIGlzIHJlYWRhYmxlLiBJZiB0aGUgdW5kZXJseWluZyByZXNvdXJjZSBpcyBubyBsb25nZXIgcmVhZGFibGUsIHRoaXMgd2lsbCBzdGlsbCByZXR1cm4gdHJ1ZVxuICAgKiB3aGlsZSB0aGVyZSBhcmUgc2lsZW5jZSBwYWRkaW5nIGZyYW1lcyBsZWZ0IHRvIHBsYXkuXG4gICAqL1xuICBwdWJsaWMgZ2V0IHJlYWRhYmxlKCkge1xuICAgIGlmICh0aGlzLnNpbGVuY2VSZW1haW5pbmcgPT09IDApIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZWFsID0gdGhpcy5wbGF5U3RyZWFtLnJlYWRhYmxlO1xuICAgIGlmICghcmVhbCkge1xuICAgICAgaWYgKHRoaXMuc2lsZW5jZVJlbWFpbmluZyA9PT0gLTEpXG4gICAgICB0aGlzLnNpbGVuY2VSZW1haW5pbmcgPSB0aGlzLnNpbGVuY2VQYWRkaW5nRnJhbWVzO1xuICAgICAgcmV0dXJuIHRoaXMuc2lsZW5jZVJlbWFpbmluZyAhPT0gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVhbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgcmVzb3VyY2UgaGFzIGVuZGVkIG9yIG5vdC5cbiAgICovXG4gIHB1YmxpYyBnZXQgZW5kZWQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMucGxheVN0cmVhbS5yZWFkYWJsZUVuZGVkIHx8XG4gICAgICB0aGlzLnBsYXlTdHJlYW0uZGVzdHJveWVkIHx8XG4gICAgICB0aGlzLnNpbGVuY2VSZW1haW5pbmcgPT09IDApO1xuXG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gcmVhZCBhbiBPcHVzIHBhY2tldCBmcm9tIHRoZSBhdWRpbyByZXNvdXJjZS4gSWYgYSBwYWNrZXQgaXMgYXZhaWxhYmxlLCB0aGUgcGxheWJhY2tEdXJhdGlvblxuICAgKiBpcyBpbmNyZW1lbnRlZC5cbiAgICpcbiAgICogQHJlbWFya3NcbiAgICogSXQgaXMgYWR2aXNhYmxlIHRvIGNoZWNrIHRoYXQgdGhlIHBsYXlTdHJlYW0gaXMgcmVhZGFibGUgYmVmb3JlIGNhbGxpbmcgdGhpcyBtZXRob2QuIFdoaWxlIG5vIHJ1bnRpbWVcbiAgICogZXJyb3JzIHdpbGwgYmUgdGhyb3duLCB5b3Ugc2hvdWxkIGNoZWNrIHRoYXQgdGhlIHJlc291cmNlIGlzIHN0aWxsIGF2YWlsYWJsZSBiZWZvcmUgYXR0ZW1wdGluZyB0b1xuICAgKiByZWFkIGZyb20gaXQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHVibGljIHJlYWQoKTogQnVmZmVyIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuc2lsZW5jZVJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNpbGVuY2VSZW1haW5pbmcgPiAwKSB7XG4gICAgICB0aGlzLnNpbGVuY2VSZW1haW5pbmctLTtcbiAgICAgIHJldHVybiBTSUxFTkNFX0ZSQU1FO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2tldCA9IHRoaXMucGxheVN0cmVhbS5yZWFkKCkgYXMgQnVmZmVyIHwgbnVsbDtcbiAgICBpZiAocGFja2V0KSB7XG4gICAgICB0aGlzLnBsYXliYWNrRHVyYXRpb24gKz0gMjA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhY2tldDtcbiAgfVxufVxuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCBhIHBhdGggY29udGFpbnMgYXQgbGVhc3Qgb25lIHZvbHVtZSB0cmFuc2Zvcm1pbmcgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSBwYXRoIC0gVGhlIHBhdGggdG8gdmFsaWRhdGUgY29uc3RyYWludHMgb25cbiAqL1xuZXhwb3J0IGNvbnN0IFZPTFVNRV9DT05TVFJBSU5UID0gKHBhdGg6IEVkZ2VbXSkgPT5cbnBhdGguc29tZSgoZWRnZSkgPT4gZWRnZS50eXBlID09PSBUcmFuc2Zvcm1lclR5cGUuSW5saW5lVm9sdW1lKTtcblxuZXhwb3J0IGNvbnN0IE5PX0NPTlNUUkFJTlQgPSAoKSA9PiB0cnVlO1xuXG4vKipcbiAqIFRyaWVzIHRvIGluZmVyIHRoZSB0eXBlIG9mIGEgc3RyZWFtIHRvIGFpZCB3aXRoIHRyYW5zY29kZXIgcGlwZWxpbmluZy5cbiAqXG4gKiBAcGFyYW0gc3RyZWFtIC0gVGhlIHN0cmVhbSB0byBpbmZlciB0aGUgdHlwZSBvZlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJTdHJlYW1UeXBlKHN0cmVhbTogUmVhZGFibGUpOiB7XG4gIGhhc1ZvbHVtZTogYm9vbGVhbjtcbiAgc3RyZWFtVHlwZTogU3RyZWFtVHlwZTtcbn0ge1xuICBpZiAoc3RyZWFtIGluc3RhbmNlb2YgT3B1c0VuY29kZXIpIHtcbiAgICByZXR1cm4geyBzdHJlYW1UeXBlOiBTdHJlYW1UeXBlLk9wdXMsIGhhc1ZvbHVtZTogZmFsc2UgfTtcbiAgfSBlbHNlIGlmIChzdHJlYW0gaW5zdGFuY2VvZiBPcHVzRGVjb2Rlcikge1xuICAgIHJldHVybiB7IHN0cmVhbVR5cGU6IFN0cmVhbVR5cGUuUmF3LCBoYXNWb2x1bWU6IGZhbHNlIH07XG4gIH0gZWxzZSBpZiAoc3RyZWFtIGluc3RhbmNlb2YgVm9sdW1lVHJhbnNmb3JtZXIpIHtcbiAgICByZXR1cm4geyBzdHJlYW1UeXBlOiBTdHJlYW1UeXBlLlJhdywgaGFzVm9sdW1lOiB0cnVlIH07XG4gIH0gZWxzZSBpZiAoc3RyZWFtIGluc3RhbmNlb2YgT2dnRGVtdXhlcikge1xuICAgIHJldHVybiB7IHN0cmVhbVR5cGU6IFN0cmVhbVR5cGUuT3B1cywgaGFzVm9sdW1lOiBmYWxzZSB9O1xuICB9IGVsc2UgaWYgKHN0cmVhbSBpbnN0YW5jZW9mIFdlYm1EZW11eGVyKSB7XG4gICAgcmV0dXJuIHsgc3RyZWFtVHlwZTogU3RyZWFtVHlwZS5PcHVzLCBoYXNWb2x1bWU6IGZhbHNlIH07XG4gIH1cblxuICByZXR1cm4geyBzdHJlYW1UeXBlOiBTdHJlYW1UeXBlLkFyYml0cmFyeSwgaGFzVm9sdW1lOiBmYWxzZSB9O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXVkaW8gcmVzb3VyY2UgdGhhdCBjYW4gYmUgcGxheWVkIGJ5IGF1ZGlvIHBsYXllcnMuXG4gKlxuICogQHJlbWFya3NcbiAqIElmIHRoZSBpbnB1dCBpcyBnaXZlbiBhcyBhIHN0cmluZywgdGhlbiB0aGUgaW5wdXRUeXBlIG9wdGlvbiB3aWxsIGJlIG92ZXJyaWRkZW4gYW5kIEZGbXBlZyB3aWxsIGJlIHVzZWQuXG4gKlxuICogSWYgdGhlIGlucHV0IGlzIG5vdCBpbiB0aGUgY29ycmVjdCBmb3JtYXQsIHRoZW4gYSBwaXBlbGluZSBvZiB0cmFuc2NvZGVycyBhbmQgdHJhbnNmb3JtZXJzIHdpbGwgYmUgY3JlYXRlZFxuICogdG8gZW5zdXJlIHRoYXQgdGhlIHJlc3VsdGFudCBzdHJlYW0gaXMgaW4gdGhlIGNvcnJlY3QgZm9ybWF0IGZvciBwbGF5YmFjay4gVGhpcyBjb3VsZCBpbnZvbHZlIHVzaW5nIEZGbXBlZyxcbiAqIE9wdXMgdHJhbnNjb2RlcnMsIGFuZCBPZ2cvV2ViTSBkZW11eGVycy5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSByZXNvdXJjZSB0byBwbGF5XG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYWJsZSBvcHRpb25zIGZvciBjcmVhdGluZyB0aGUgcmVzb3VyY2VcbiAqIEB0eXBlUGFyYW0gTWV0YWRhdGEgLSB0aGUgdHlwZSBmb3IgdGhlIG1ldGFkYXRhIChpZiBhbnkpIG9mIHRoZSBhdWRpbyByZXNvdXJjZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXVkaW9SZXNvdXJjZTxNZXRhZGF0YT4oXG5pbnB1dDogUmVhZGFibGUgfCBzdHJpbmcsXG5vcHRpb25zOiBDcmVhdGVBdWRpb1Jlc291cmNlT3B0aW9uczxNZXRhZGF0YT4gJlxuUGljazxcbiAgTWV0YWRhdGEgZXh0ZW5kcyBudWxsIHwgdW5kZWZpbmVkID9cbiAgQ3JlYXRlQXVkaW9SZXNvdXJjZU9wdGlvbnM8TWV0YWRhdGE+IDpcbiAgUmVxdWlyZWQ8Q3JlYXRlQXVkaW9SZXNvdXJjZU9wdGlvbnM8TWV0YWRhdGE+PixcbiAgJ21ldGFkYXRhJz4pXG5cbjogQXVkaW9SZXNvdXJjZTxNZXRhZGF0YSBleHRlbmRzIG51bGwgfCB1bmRlZmluZWQgPyBudWxsIDogTWV0YWRhdGE+O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXVkaW8gcmVzb3VyY2UgdGhhdCBjYW4gYmUgcGxheWVkIGJ5IGF1ZGlvIHBsYXllcnMuXG4gKlxuICogQHJlbWFya3NcbiAqIElmIHRoZSBpbnB1dCBpcyBnaXZlbiBhcyBhIHN0cmluZywgdGhlbiB0aGUgaW5wdXRUeXBlIG9wdGlvbiB3aWxsIGJlIG92ZXJyaWRkZW4gYW5kIEZGbXBlZyB3aWxsIGJlIHVzZWQuXG4gKlxuICogSWYgdGhlIGlucHV0IGlzIG5vdCBpbiB0aGUgY29ycmVjdCBmb3JtYXQsIHRoZW4gYSBwaXBlbGluZSBvZiB0cmFuc2NvZGVycyBhbmQgdHJhbnNmb3JtZXJzIHdpbGwgYmUgY3JlYXRlZFxuICogdG8gZW5zdXJlIHRoYXQgdGhlIHJlc3VsdGFudCBzdHJlYW0gaXMgaW4gdGhlIGNvcnJlY3QgZm9ybWF0IGZvciBwbGF5YmFjay4gVGhpcyBjb3VsZCBpbnZvbHZlIHVzaW5nIEZGbXBlZyxcbiAqIE9wdXMgdHJhbnNjb2RlcnMsIGFuZCBPZ2cvV2ViTSBkZW11eGVycy5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSByZXNvdXJjZSB0byBwbGF5XG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYWJsZSBvcHRpb25zIGZvciBjcmVhdGluZyB0aGUgcmVzb3VyY2VcbiAqIEB0eXBlUGFyYW0gTWV0YWRhdGEgLSB0aGUgdHlwZSBmb3IgdGhlIG1ldGFkYXRhIChpZiBhbnkpIG9mIHRoZSBhdWRpbyByZXNvdXJjZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXVkaW9SZXNvdXJjZTxNZXRhZGF0YSBleHRlbmRzIG51bGwgfCB1bmRlZmluZWQ+KFxuaW5wdXQ6IFJlYWRhYmxlIHwgc3RyaW5nLFxub3B0aW9ucz86IE9taXQ8Q3JlYXRlQXVkaW9SZXNvdXJjZU9wdGlvbnM8TWV0YWRhdGE+LCAnbWV0YWRhdGEnPilcbjogQXVkaW9SZXNvdXJjZTxudWxsPjtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGF1ZGlvIHJlc291cmNlIHRoYXQgY2FuIGJlIHBsYXllZCBieSBhdWRpbyBwbGF5ZXJzLlxuICpcbiAqIEByZW1hcmtzXG4gKiBJZiB0aGUgaW5wdXQgaXMgZ2l2ZW4gYXMgYSBzdHJpbmcsIHRoZW4gdGhlIGlucHV0VHlwZSBvcHRpb24gd2lsbCBiZSBvdmVycmlkZGVuIGFuZCBGRm1wZWcgd2lsbCBiZSB1c2VkLlxuICpcbiAqIElmIHRoZSBpbnB1dCBpcyBub3QgaW4gdGhlIGNvcnJlY3QgZm9ybWF0LCB0aGVuIGEgcGlwZWxpbmUgb2YgdHJhbnNjb2RlcnMgYW5kIHRyYW5zZm9ybWVycyB3aWxsIGJlIGNyZWF0ZWRcbiAqIHRvIGVuc3VyZSB0aGF0IHRoZSByZXN1bHRhbnQgc3RyZWFtIGlzIGluIHRoZSBjb3JyZWN0IGZvcm1hdCBmb3IgcGxheWJhY2suIFRoaXMgY291bGQgaW52b2x2ZSB1c2luZyBGRm1wZWcsXG4gKiBPcHVzIHRyYW5zY29kZXJzLCBhbmQgT2dnL1dlYk0gZGVtdXhlcnMuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgcmVzb3VyY2UgdG8gcGxheVxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmFibGUgb3B0aW9ucyBmb3IgY3JlYXRpbmcgdGhlIHJlc291cmNlXG4gKiBAdHlwZVBhcmFtIE1ldGFkYXRhIC0gdGhlIHR5cGUgZm9yIHRoZSBtZXRhZGF0YSAoaWYgYW55KSBvZiB0aGUgYXVkaW8gcmVzb3VyY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUF1ZGlvUmVzb3VyY2U8TWV0YWRhdGE+KFxuaW5wdXQ6IFJlYWRhYmxlIHwgc3RyaW5nLFxub3B0aW9uczogQ3JlYXRlQXVkaW9SZXNvdXJjZU9wdGlvbnM8TWV0YWRhdGE+ID0ge30pXG46IEF1ZGlvUmVzb3VyY2U8TWV0YWRhdGE+IHtcbiAgbGV0IGlucHV0VHlwZSA9IG9wdGlvbnMuaW5wdXRUeXBlO1xuICBsZXQgbmVlZHNJbmxpbmVWb2x1bWUgPSBCb29sZWFuKG9wdGlvbnMuaW5saW5lVm9sdW1lKTtcblxuICAvLyBzdHJpbmcgaW5wdXRzIGNhbiBvbmx5IGJlIHVzZWQgd2l0aCBGRm1wZWdcbiAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICBpbnB1dFR5cGUgPSBTdHJlYW1UeXBlLkFyYml0cmFyeTtcbiAgfSBlbHNlIGlmIChpbnB1dFR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGFuYWx5c2lzID0gaW5mZXJTdHJlYW1UeXBlKGlucHV0KTtcbiAgICBpbnB1dFR5cGUgPSBhbmFseXNpcy5zdHJlYW1UeXBlO1xuICAgIG5lZWRzSW5saW5lVm9sdW1lID0gbmVlZHNJbmxpbmVWb2x1bWUgJiYgIWFuYWx5c2lzLmhhc1ZvbHVtZTtcbiAgfVxuXG4gIGNvbnN0IHRyYW5zZm9ybWVyUGlwZWxpbmUgPSBmaW5kUGlwZWxpbmUoXG4gICAgaW5wdXRUeXBlLFxuICAgIG5lZWRzSW5saW5lVm9sdW1lID8gVk9MVU1FX0NPTlNUUkFJTlQgOiBOT19DT05TVFJBSU5UXG4gICk7XG5cbiAgaWYgKHRyYW5zZm9ybWVyUGlwZWxpbmUubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgcGlwZWxpbmUgY29uc3RydWN0ZWQgZm9yIHN0cmluZyByZXNvdXJjZSAnJHtpbnB1dH0nYFxuICAgICk7XG4gICAgLy8gTm8gYWRqdXN0bWVudHMgcmVxdWlyZWRcbiAgICByZXR1cm4gbmV3IEF1ZGlvUmVzb3VyY2U8TWV0YWRhdGE+KFxuICAgICAgW10sXG4gICAgICBbaW5wdXRdLFxuICAgICAgKG9wdGlvbnMubWV0YWRhdGEgPz8gbnVsbCkgYXMgTWV0YWRhdGEsXG4gICAgICBvcHRpb25zLnNpbGVuY2VQYWRkaW5nRnJhbWVzID8/IDVcbiAgICApO1xuICB9XG5cbiAgY29uc3Qgc3RyZWFtcyA9IHRyYW5zZm9ybWVyUGlwZWxpbmUubWFwKChlZGdlKSA9PiBlZGdlLnRyYW5zZm9ybWVyKGlucHV0KSk7XG4gIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSBzdHJlYW1zLnVuc2hpZnQoaW5wdXQpO1xuXG4gIHJldHVybiBuZXcgQXVkaW9SZXNvdXJjZTxNZXRhZGF0YT4oXG4gICAgdHJhbnNmb3JtZXJQaXBlbGluZSxcbiAgICBzdHJlYW1zLFxuICAgIChvcHRpb25zLm1ldGFkYXRhID8/IG51bGwpIGFzIE1ldGFkYXRhLFxuICAgIG9wdGlvbnMuc2lsZW5jZVBhZGRpbmdGcmFtZXMgPz8gNVxuICApO1xufSIsICIvLyBDb3B5cmlnaHQgZGlzY29yZC1wbGF5ZXIgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIExpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgZGlzY29yZC5qcyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBBcGFjaGUgTGljZW5zZSAyLjBcblxuaW1wb3J0IHR5cGUgeyBSZWFkYWJsZSB9IGZyb20gJ25vZGU6c3RyZWFtJztcbmltcG9ydCB7XG4gIE9wdXNFbmNvZGVyLFxuICBPcHVzRGVjb2RlcixcbiAgT2dnRGVtdXhlcixcbiAgV2VibURlbXV4ZXIgfSBmcm9tXG4nQGRpc2NvcmQtcGxheWVyL29wdXMnO1xuaW1wb3J0IHsgY3JlYXRlRkZtcGVnQXJncywgRkZtcGVnIH0gZnJvbSAnQGRpc2NvcmQtcGxheWVyL2ZmbXBlZyc7XG5pbXBvcnQgeyBWb2x1bWVUcmFuc2Zvcm1lciB9IGZyb20gJ0BkaXNjb3JkLXBsYXllci9lcXVhbGl6ZXInO1xuXG5jb25zdCBGRk1QRUdfUENNX0FSR1VNRU5UUyA9IGNyZWF0ZUZGbXBlZ0FyZ3Moe1xuICBhbmFseXplZHVyYXRpb246ICcwJyxcbiAgbG9nbGV2ZWw6ICcwJyxcbiAgZjogJ3MxNmxlJyxcbiAgYXI6ICc0ODAwMCcsXG4gIGFjOiAnMidcbn0pO1xuXG5jb25zdCBGRk1QRUdfT1BVU19BUkdVTUVOVFMgPSBjcmVhdGVGRm1wZWdBcmdzKHtcbiAgYW5hbHl6ZWR1cmF0aW9uOiAnMCcsXG4gIGxvZ2xldmVsOiAnMCcsXG4gIGFjb2RlYzogJ2xpYm9wdXMnLFxuICBmOiAnb3B1cycsXG4gIGFyOiAnNDgwMDAnLFxuICBhYzogJzInXG59KTtcblxuLyoqXG4gKiBUaGUgZGlmZmVyZW50IHR5cGVzIG9mIHN0cmVhbSB0aGF0IGNhbiBleGlzdCB3aXRoaW4gdGhlIHBpcGVsaW5lLlxuICovXG5leHBvcnQgZW51bSBTdHJlYW1UeXBlIHtcbiAgLyoqXG4gICAqIFRoZSB0eXBlIG9mIHRoZSBzdHJlYW0gYXQgdGhpcyBwb2ludCBpcyB1bmtub3duLlxuICAgKi9cbiAgQXJiaXRyYXJ5ID0gJ2FyYml0cmFyeScsXG4gIC8qKlxuICAgKiBUaGUgc3RyZWFtIGF0IHRoaXMgcG9pbnQgaXMgT3B1cyBhdWRpbyBlbmNvZGVkIGluIGFuIE9nZyB3cmFwcGVyLlxuICAgKi9cbiAgT2dnT3B1cyA9ICdvZ2cvb3B1cycsXG4gIC8qKlxuICAgKiBUaGUgc3RyZWFtIGF0IHRoaXMgcG9pbnQgaXMgT3B1cyBhdWRpbywgYW5kIHRoZSBzdHJlYW0gaXMgaW4gb2JqZWN0LW1vZGUuIFRoaXMgaXMgcmVhZHkgdG8gcGxheS5cbiAgICovXG4gIE9wdXMgPSAnb3B1cycsXG4gIC8qKlxuICAgKiBUaGUgc3RyZWFtIGF0IHRoaXMgcG9pbnQgaXMgczE2bGUgUENNLlxuICAgKi9cbiAgUmF3ID0gJ3JhdycsXG4gIC8qKlxuICAgKiBUaGUgc3RyZWFtIGF0IHRoaXMgcG9pbnQgaXMgT3B1cyBhdWRpbyBlbmNvZGVkIGluIGEgV2ViTSB3cmFwcGVyLlxuICAgKi9cbiAgV2VibU9wdXMgPSAnd2VibS9vcHVzJyxcbn1cblxuLyoqXG4gKiBUaGUgZGlmZmVyZW50IHR5cGVzIG9mIHRyYW5zZm9ybWVycyB0aGF0IGNhbiBleGlzdCB3aXRoaW4gdGhlIHBpcGVsaW5lLlxuICovXG5leHBvcnQgZW51bSBUcmFuc2Zvcm1lclR5cGUge1xuICBGRm1wZWdPZ2cgPSAnZmZtcGVnIG9nZycsXG4gIEZGbXBlZ1BDTSA9ICdmZm1wZWcgcGNtJyxcbiAgSW5saW5lVm9sdW1lID0gJ3ZvbHVtZSB0cmFuc2Zvcm1lcicsXG4gIE9nZ09wdXNEZW11eGVyID0gJ29nZy9vcHVzIGRlbXV4ZXInLFxuICBPcHVzRGVjb2RlciA9ICdvcHVzIGRlY29kZXInLFxuICBPcHVzRW5jb2RlciA9ICdvcHVzIGVuY29kZXInLFxuICBXZWJtT3B1c0RlbXV4ZXIgPSAnd2VibS9vcHVzIGRlbXV4ZXInLFxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBwYXRod2F5IGZyb20gb25lIHN0cmVhbSB0eXBlIHRvIGFub3RoZXIgdXNpbmcgYSB0cmFuc2Zvcm1lci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFZGdlIHtcbiAgY29zdDogbnVtYmVyO1xuICBmcm9tOiBOb2RlO1xuICB0bzogTm9kZTtcbiAgdHJhbnNmb3JtZXIoaW5wdXQ6IFJlYWRhYmxlIHwgc3RyaW5nKTogUmVhZGFibGU7XG4gIHR5cGU6IFRyYW5zZm9ybWVyVHlwZTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdHlwZSBvZiBzdHJlYW0gd2l0aGluIHRoZSBncmFwaCwgZS5nLiBhbiBPcHVzIHN0cmVhbSwgb3IgYSBzdHJlYW0gb2YgcmF3IGF1ZGlvLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZSB7XG4gIC8qKlxuICAgKiBUaGUgb3V0Ym91bmQgZWRnZXMgZnJvbSB0aGlzIG5vZGUuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZWRnZXM6IEVkZ2VbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiBzdHJlYW0gZm9yIHRoaXMgbm9kZS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBTdHJlYW1UeXBlO1xuXG4gIHB1YmxpYyBjb25zdHJ1Y3Rvcih0eXBlOiBTdHJlYW1UeXBlKSB7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG91dGJvdW5kIGVkZ2UgZnJvbSB0aGlzIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSBlZGdlIC0gVGhlIGVkZ2UgdG8gY3JlYXRlXG4gICAqL1xuICBwdWJsaWMgYWRkRWRnZShlZGdlOiBPbWl0PEVkZ2UsICdmcm9tJz4pIHtcbiAgICB0aGlzLmVkZ2VzLnB1c2goeyAuLi5lZGdlLCBmcm9tOiB0aGlzIH0pO1xuICB9XG59XG5cbi8vIENyZWF0ZSBhIG5vZGUgZm9yIGVhY2ggc3RyZWFtIHR5cGVcbmxldCBOT0RFUzogTWFwPFN0cmVhbVR5cGUsIE5vZGU+IHwgbnVsbCA9IG51bGw7XG5cbmZ1bmN0aW9uIGNhbkVuYWJsZUZGbXBlZ09wdGltaXphdGlvbnMoKTogYm9vbGVhbiB7XG4gIHJldHVybiBGRm1wZWcucmVzb2x2ZVNhZmUoKT8ucmVzdWx0LmluY2x1ZGVzKCctLWVuYWJsZS1saWJvcHVzJykgPT09IHRydWU7XG59XG5cbi8qKlxuICogR2V0cyBhIG5vZGUgZnJvbSBpdHMgc3RyZWFtIHR5cGUuXG4gKlxuICogQHBhcmFtIHR5cGUgLSBUaGUgc3RyZWFtIHR5cGUgb2YgdGhlIHRhcmdldCBub2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlKHR5cGU6IFN0cmVhbVR5cGUpIHtcbiAgY29uc3Qgbm9kZSA9IChOT0RFUyA/Pz0gaW5pdGlhbGl6ZU5vZGVzKCkpLmdldCh0eXBlKTtcbiAgaWYgKCFub2RlKSB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgdHlwZSAnJHt0eXBlfScgZG9lcyBub3QgZXhpc3QhYCk7XG4gIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBpbml0aWFsaXplTm9kZXMoKTogTWFwPFN0cmVhbVR5cGUsIE5vZGU+IHtcbiAgY29uc3Qgbm9kZXMgPSBuZXcgTWFwPFN0cmVhbVR5cGUsIE5vZGU+KCk7XG4gIGZvciAoY29uc3Qgc3RyZWFtVHlwZSBvZiBPYmplY3QudmFsdWVzKFN0cmVhbVR5cGUpKSB7XG4gICAgbm9kZXMuc2V0KHN0cmVhbVR5cGUsIG5ldyBOb2RlKHN0cmVhbVR5cGUpKTtcbiAgfVxuXG4gIG5vZGVzLmdldChTdHJlYW1UeXBlLlJhdykhLmFkZEVkZ2Uoe1xuICAgIHR5cGU6IFRyYW5zZm9ybWVyVHlwZS5PcHVzRW5jb2RlcixcbiAgICB0bzogbm9kZXMuZ2V0KFN0cmVhbVR5cGUuT3B1cykhLFxuICAgIGNvc3Q6IDEuNSxcbiAgICB0cmFuc2Zvcm1lcjogKCkgPT5cbiAgICBuZXcgT3B1c0VuY29kZXIoeyByYXRlOiA0OF8wMDAsIGNoYW5uZWxzOiAyLCBmcmFtZVNpemU6IDk2MCB9KVxuICB9KTtcblxuICBub2Rlcy5nZXQoU3RyZWFtVHlwZS5PcHVzKSEuYWRkRWRnZSh7XG4gICAgdHlwZTogVHJhbnNmb3JtZXJUeXBlLk9wdXNEZWNvZGVyLFxuICAgIHRvOiBub2Rlcy5nZXQoU3RyZWFtVHlwZS5SYXcpISxcbiAgICBjb3N0OiAxLjUsXG4gICAgdHJhbnNmb3JtZXI6ICgpID0+XG4gICAgbmV3IE9wdXNEZWNvZGVyKHsgcmF0ZTogNDhfMDAwLCBjaGFubmVsczogMiwgZnJhbWVTaXplOiA5NjAgfSlcbiAgfSk7XG5cbiAgbm9kZXMuZ2V0KFN0cmVhbVR5cGUuT2dnT3B1cykhLmFkZEVkZ2Uoe1xuICAgIHR5cGU6IFRyYW5zZm9ybWVyVHlwZS5PZ2dPcHVzRGVtdXhlcixcbiAgICB0bzogbm9kZXMuZ2V0KFN0cmVhbVR5cGUuT3B1cykhLFxuICAgIGNvc3Q6IDEsXG4gICAgdHJhbnNmb3JtZXI6ICgpID0+IG5ldyBPZ2dEZW11eGVyKClcbiAgfSk7XG5cbiAgbm9kZXMuZ2V0KFN0cmVhbVR5cGUuV2VibU9wdXMpIS5hZGRFZGdlKHtcbiAgICB0eXBlOiBUcmFuc2Zvcm1lclR5cGUuV2VibU9wdXNEZW11eGVyLFxuICAgIHRvOiBub2Rlcy5nZXQoU3RyZWFtVHlwZS5PcHVzKSEsXG4gICAgY29zdDogMSxcbiAgICB0cmFuc2Zvcm1lcjogKCkgPT4gbmV3IFdlYm1EZW11eGVyKClcbiAgfSk7XG5cbiAgY29uc3QgRkZNUEVHX1BDTV9FREdFOiBPbWl0PEVkZ2UsICdmcm9tJz4gPSB7XG4gICAgdHlwZTogVHJhbnNmb3JtZXJUeXBlLkZGbXBlZ1BDTSxcbiAgICB0bzogbm9kZXMuZ2V0KFN0cmVhbVR5cGUuUmF3KSEsXG4gICAgY29zdDogMixcbiAgICB0cmFuc2Zvcm1lcjogKGlucHV0KSA9PlxuICAgIG5ldyBGRm1wZWcoe1xuICAgICAgYXJnczogW1xuICAgICAgJy1pJyxcbiAgICAgIHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgPyBpbnB1dCA6ICctJyxcbiAgICAgIC4uLkZGTVBFR19QQ01fQVJHVU1FTlRTXVxuXG4gICAgfSlcbiAgfTtcblxuICBub2Rlcy5nZXQoU3RyZWFtVHlwZS5BcmJpdHJhcnkpIS5hZGRFZGdlKEZGTVBFR19QQ01fRURHRSk7XG4gIG5vZGVzLmdldChTdHJlYW1UeXBlLk9nZ09wdXMpIS5hZGRFZGdlKEZGTVBFR19QQ01fRURHRSk7XG4gIG5vZGVzLmdldChTdHJlYW1UeXBlLldlYm1PcHVzKSEuYWRkRWRnZShGRk1QRUdfUENNX0VER0UpO1xuXG4gIG5vZGVzLmdldChTdHJlYW1UeXBlLlJhdykhLmFkZEVkZ2Uoe1xuICAgIHR5cGU6IFRyYW5zZm9ybWVyVHlwZS5JbmxpbmVWb2x1bWUsXG4gICAgdG86IG5vZGVzLmdldChTdHJlYW1UeXBlLlJhdykhLFxuICAgIGNvc3Q6IDAuNSxcbiAgICB0cmFuc2Zvcm1lcjogKCkgPT4gbmV3IFZvbHVtZVRyYW5zZm9ybWVyKHsgdHlwZTogJ3MxNmxlJyB9KVxuICB9KTtcblxuICBpZiAoY2FuRW5hYmxlRkZtcGVnT3B0aW1pemF0aW9ucygpKSB7XG4gICAgY29uc3QgRkZNUEVHX09HR19FREdFOiBPbWl0PEVkZ2UsICdmcm9tJz4gPSB7XG4gICAgICB0eXBlOiBUcmFuc2Zvcm1lclR5cGUuRkZtcGVnT2dnLFxuICAgICAgdG86IG5vZGVzLmdldChTdHJlYW1UeXBlLk9nZ09wdXMpISxcbiAgICAgIGNvc3Q6IDIsXG4gICAgICB0cmFuc2Zvcm1lcjogKGlucHV0KSA9PlxuICAgICAgbmV3IEZGbXBlZyh7XG4gICAgICAgIGFyZ3M6IFtcbiAgICAgICAgJy1pJyxcbiAgICAgICAgdHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IGlucHV0IDogJy0nLFxuICAgICAgICAuLi5GRk1QRUdfT1BVU19BUkdVTUVOVFNdXG5cbiAgICAgIH0pXG4gICAgfTtcbiAgICBub2Rlcy5nZXQoU3RyZWFtVHlwZS5BcmJpdHJhcnkpIS5hZGRFZGdlKEZGTVBFR19PR0dfRURHRSk7XG4gICAgLy8gSW5jbHVkZSBPZ2cgYW5kIFdlYk0gYXMgd2VsbCBpbiBjYXNlIHRoZXkgaGF2ZSBkaWZmZXJlbnQgc2FtcGxpbmcgcmF0ZXMgb3IgYXJlIG1vbm8gaW5zdGVhZCBvZiBzdGVyZW9cbiAgICAvLyBhdCB0aGUgbW9tZW50LCB0aGlzIHdpbGwgbm90IGRvIGFueXRoaW5nLiBIb3dldmVyLCBpZi93aGVuIGRldGVjdGlvbiBmb3IgY29ycmVjdCBPcHVzIGhlYWRlcnMgaXNcbiAgICAvLyBpbXBsZW1lbnRlZCwgdGhpcyB3aWxsIGhlbHAgaW5mb3JtIHRoZSB2b2ljZSBlbmdpbmUgdGhhdCBpdCBpcyBhYmxlIHRvIHRyYW5zY29kZSB0aGUgYXVkaW8uXG4gICAgbm9kZXMuZ2V0KFN0cmVhbVR5cGUuT2dnT3B1cykhLmFkZEVkZ2UoRkZNUEVHX09HR19FREdFKTtcbiAgICBub2Rlcy5nZXQoU3RyZWFtVHlwZS5XZWJtT3B1cykhLmFkZEVkZ2UoRkZNUEVHX09HR19FREdFKTtcbiAgfVxuXG4gIHJldHVybiBub2Rlcztcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc3RlcCBpbiB0aGUgcGF0aCBmcm9tIG5vZGUgQSB0byBub2RlIEIuXG4gKi9cbmludGVyZmFjZSBTdGVwIHtcbiAgLyoqXG4gICAqIFRoZSBjb3N0IG9mIHRoZSBzdGVwcyBhZnRlciB0aGlzIHN0ZXAuXG4gICAqL1xuICBjb3N0OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBlZGdlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0ZXAuXG4gICAqL1xuICBlZGdlPzogRWRnZTtcblxuICAvKipcbiAgICogVGhlIG5leHQgc3RlcC5cbiAgICovXG4gIG5leHQ/OiBTdGVwO1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBzaG9ydGVzdCBjb3N0IHBhdGggZnJvbSBub2RlIEEgdG8gbm9kZSBCLlxuICpcbiAqIEBwYXJhbSBmcm9tIC0gVGhlIHN0YXJ0IG5vZGVcbiAqIEBwYXJhbSBjb25zdHJhaW50cyAtIEV4dHJhIHZhbGlkYXRpb24gZm9yIGEgcG90ZW50aWFsIHNvbHV0aW9uLiBUYWtlcyBhIHBhdGgsIHJldHVybnMgdHJ1ZSBpZiB0aGUgcGF0aCBpcyB2YWxpZFxuICogQHBhcmFtIGdvYWwgLSBUaGUgdGFyZ2V0IG5vZGVcbiAqIEBwYXJhbSBwYXRoIC0gVGhlIHJ1bm5pbmcgcGF0aFxuICogQHBhcmFtIGRlcHRoIC0gVGhlIG51bWJlciBvZiByZW1haW5pbmcgcmVjdXJzaW9uc1xuICovXG5mdW5jdGlvbiBmaW5kUGF0aChcbmZyb206IE5vZGUsXG5jb25zdHJhaW50czogKHBhdGg6IEVkZ2VbXSkgPT4gYm9vbGVhbixcbmdvYWwgPSBnZXROb2RlKFN0cmVhbVR5cGUuT3B1cyksXG5wYXRoOiBFZGdlW10gPSBbXSxcbmRlcHRoID0gNSlcbjogU3RlcCB7XG4gIGlmIChmcm9tID09PSBnb2FsICYmIGNvbnN0cmFpbnRzKHBhdGgpKSB7XG4gICAgcmV0dXJuIHsgY29zdDogMCB9O1xuICB9IGVsc2UgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgY29zdDogTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZIH07XG4gIH1cblxuICBsZXQgY3VycmVudEJlc3Q6IFN0ZXAgfCB1bmRlZmluZWQ7XG4gIGZvciAoY29uc3QgZWRnZSBvZiBmcm9tLmVkZ2VzKSB7XG4gICAgaWYgKGN1cnJlbnRCZXN0ICYmIGVkZ2UuY29zdCA+IGN1cnJlbnRCZXN0LmNvc3QpIGNvbnRpbnVlO1xuICAgIGNvbnN0IG5leHQgPSBmaW5kUGF0aChcbiAgICAgIGVkZ2UudG8sXG4gICAgICBjb25zdHJhaW50cyxcbiAgICAgIGdvYWwsXG4gICAgICBbLi4ucGF0aCwgZWRnZV0sXG4gICAgICBkZXB0aCAtIDFcbiAgICApO1xuICAgIGNvbnN0IGNvc3QgPSBlZGdlLmNvc3QgKyBuZXh0LmNvc3Q7XG4gICAgaWYgKCFjdXJyZW50QmVzdCB8fCBjb3N0IDwgY3VycmVudEJlc3QuY29zdCkge1xuICAgICAgY3VycmVudEJlc3QgPSB7IGNvc3QsIGVkZ2UsIG5leHQgfTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY3VycmVudEJlc3QgPz8geyBjb3N0OiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgfTtcbn1cblxuLyoqXG4gKiBUYWtlcyB0aGUgc29sdXRpb24gZnJvbSBmaW5kUGF0aCBhbmQgYXNzZW1ibGVzIGl0IGludG8gYSBsaXN0IG9mIGVkZ2VzLlxuICpcbiAqIEBwYXJhbSBzdGVwIC0gVGhlIGZpcnN0IHN0ZXAgb2YgdGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gY29uc3RydWN0UGlwZWxpbmUoc3RlcDogU3RlcCkge1xuICBjb25zdCBlZGdlczogRWRnZVtdID0gW107XG4gIGxldCBjdXJyZW50OiBTdGVwIHwgdW5kZWZpbmVkID0gc3RlcDtcbiAgd2hpbGUgKGN1cnJlbnQ/LmVkZ2UpIHtcbiAgICBlZGdlcy5wdXNoKGN1cnJlbnQuZWRnZSk7XG4gICAgY3VycmVudCA9IGN1cnJlbnQubmV4dDtcbiAgfVxuXG4gIHJldHVybiBlZGdlcztcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgbG93ZXN0LWNvc3QgcGlwZWxpbmUgdG8gY29udmVydCB0aGUgaW5wdXQgc3RyZWFtIHR5cGUgaW50byBhbiBPcHVzIHN0cmVhbS5cbiAqXG4gKiBAcGFyYW0gZnJvbSAtIFRoZSBzdHJlYW0gdHlwZSB0byBzdGFydCBmcm9tXG4gKiBAcGFyYW0gY29uc3RyYWludCAtIEV4dHJhIGNvbnN0cmFpbnRzIHRoYXQgbWF5IGJlIGltcG9zZWQgb24gcG90ZW50aWFsIHNvbHV0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGlwZWxpbmUoXG5mcm9tOiBTdHJlYW1UeXBlLFxuY29uc3RyYWludDogKHBhdGg6IEVkZ2VbXSkgPT4gYm9vbGVhbilcbntcbiAgcmV0dXJuIGNvbnN0cnVjdFBpcGVsaW5lKGZpbmRQYXRoKGdldE5vZGUoZnJvbSksIGNvbnN0cmFpbnQpKTtcbn0iLCAiLy8gQ29weXJpZ2h0IGRpc2NvcmQtcGxheWVyIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBMaWNlbnNlLlxuLy8gQ29weXJpZ2h0IGRpc2NvcmQuanMgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gQXBhY2hlIExpY2Vuc2UgMi4wXG5cbmltcG9ydCB7IHR5cGUgRXZlbnRFbWl0dGVyLCBvbmNlIH0gZnJvbSAnbm9kZTpldmVudHMnO1xuaW1wb3J0IHR5cGUge1xuICBWb2ljZUNvbm5lY3Rpb24sXG4gIFZvaWNlQ29ubmVjdGlvblN0YXR1cyB9IGZyb21cbicuLi9Wb2ljZUNvbm5lY3Rpb24nO1xuaW1wb3J0IHR5cGUgeyBBdWRpb1BsYXllciwgQXVkaW9QbGF5ZXJTdGF0dXMgfSBmcm9tICcuLi9hdWRpby9BdWRpb1BsYXllcic7XG5pbXBvcnQgeyBhYm9ydEFmdGVyIH0gZnJvbSAnLi9hYm9ydEFmdGVyJztcblxuLyoqXG4gKiBBbGxvd3MgYSB2b2ljZSBjb25uZWN0aW9uIGEgc3BlY2lmaWVkIGFtb3VudCBvZiB0aW1lIHRvIGVudGVyIGEgZ2l2ZW4gc3RhdGUsIG90aGVyd2lzZSByZWplY3RzIHdpdGggYW4gZXJyb3IuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFRoZSB2b2ljZSBjb25uZWN0aW9uIHRoYXQgd2Ugd2FudCB0byBvYnNlcnZlIHRoZSBzdGF0ZSBjaGFuZ2UgZm9yXG4gKiBAcGFyYW0gc3RhdHVzIC0gVGhlIHN0YXR1cyB0aGF0IHRoZSB2b2ljZSBjb25uZWN0aW9uIHNob3VsZCBiZSBpblxuICogQHBhcmFtIHRpbWVvdXRPclNpZ25hbCAtIFRoZSBtYXhpbXVtIHRpbWUgd2UgYXJlIGFsbG93aW5nIGZvciB0aGlzIHRvIG9jY3VyLCBvciBhIHNpZ25hbCB0aGF0IHdpbGwgYWJvcnQgdGhlIG9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZW50ZXJzU3RhdGUoXG50YXJnZXQ6IFZvaWNlQ29ubmVjdGlvbixcbnN0YXR1czogVm9pY2VDb25uZWN0aW9uU3RhdHVzLFxudGltZW91dE9yU2lnbmFsOiBBYm9ydFNpZ25hbCB8IG51bWJlcilcbjogUHJvbWlzZTxWb2ljZUNvbm5lY3Rpb24+O1xuXG4vKipcbiAqIEFsbG93cyBhbiBhdWRpbyBwbGF5ZXIgYSBzcGVjaWZpZWQgYW1vdW50IG9mIHRpbWUgdG8gZW50ZXIgYSBnaXZlbiBzdGF0ZSwgb3RoZXJ3aXNlIHJlamVjdHMgd2l0aCBhbiBlcnJvci5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IC0gVGhlIGF1ZGlvIHBsYXllciB0aGF0IHdlIHdhbnQgdG8gb2JzZXJ2ZSB0aGUgc3RhdGUgY2hhbmdlIGZvclxuICogQHBhcmFtIHN0YXR1cyAtIFRoZSBzdGF0dXMgdGhhdCB0aGUgYXVkaW8gcGxheWVyIHNob3VsZCBiZSBpblxuICogQHBhcmFtIHRpbWVvdXRPclNpZ25hbCAtIFRoZSBtYXhpbXVtIHRpbWUgd2UgYXJlIGFsbG93aW5nIGZvciB0aGlzIHRvIG9jY3VyLCBvciBhIHNpZ25hbCB0aGF0IHdpbGwgYWJvcnQgdGhlIG9wZXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZW50ZXJzU3RhdGUoXG50YXJnZXQ6IEF1ZGlvUGxheWVyLFxuc3RhdHVzOiBBdWRpb1BsYXllclN0YXR1cyxcbnRpbWVvdXRPclNpZ25hbDogQWJvcnRTaWduYWwgfCBudW1iZXIpXG46IFByb21pc2U8QXVkaW9QbGF5ZXI+O1xuXG4vKipcbiAqIEFsbG93cyBhIHRhcmdldCBhIHNwZWNpZmllZCBhbW91bnQgb2YgdGltZSB0byBlbnRlciBhIGdpdmVuIHN0YXRlLCBvdGhlcndpc2UgcmVqZWN0cyB3aXRoIGFuIGVycm9yLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBUaGUgb2JqZWN0IHRoYXQgd2Ugd2FudCB0byBvYnNlcnZlIHRoZSBzdGF0ZSBjaGFuZ2UgZm9yXG4gKiBAcGFyYW0gc3RhdHVzIC0gVGhlIHN0YXR1cyB0aGF0IHRoZSB0YXJnZXQgc2hvdWxkIGJlIGluXG4gKiBAcGFyYW0gdGltZW91dE9yU2lnbmFsIC0gVGhlIG1heGltdW0gdGltZSB3ZSBhcmUgYWxsb3dpbmcgZm9yIHRoaXMgdG8gb2NjdXIsIG9yIGEgc2lnbmFsIHRoYXQgd2lsbCBhYm9ydCB0aGUgb3BlcmF0aW9uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnRlcnNTdGF0ZTxUYXJnZXQgZXh0ZW5kcyBBdWRpb1BsYXllciB8IFZvaWNlQ29ubmVjdGlvbj4oXG50YXJnZXQ6IFRhcmdldCxcbnN0YXR1czogQXVkaW9QbGF5ZXJTdGF0dXMgfCBWb2ljZUNvbm5lY3Rpb25TdGF0dXMsXG50aW1lb3V0T3JTaWduYWw6IEFib3J0U2lnbmFsIHwgbnVtYmVyKVxue1xuICBpZiAodGFyZ2V0LnN0YXRlLnN0YXR1cyAhPT0gc3RhdHVzKSB7XG4gICAgY29uc3QgW2FjLCBzaWduYWxdID1cbiAgICB0eXBlb2YgdGltZW91dE9yU2lnbmFsID09PSAnbnVtYmVyJyA/XG4gICAgYWJvcnRBZnRlcih0aW1lb3V0T3JTaWduYWwpIDpcbiAgICBbdW5kZWZpbmVkLCB0aW1lb3V0T3JTaWduYWxdO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBvbmNlKHRhcmdldCBhcyBFdmVudEVtaXR0ZXIsIHN0YXR1cywgeyBzaWduYWwgfSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGFjPy5hYm9ydCgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59IiwgIi8vIENvcHlyaWdodCBkaXNjb3JkLXBsYXllciBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgTGljZW5zZS5cbi8vIENvcHlyaWdodCBkaXNjb3JkLmpzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIEFwYWNoZSBMaWNlbnNlIDIuMFxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYWJvcnQgY29udHJvbGxlciB0aGF0IGFib3J0cyBhZnRlciB0aGUgZ2l2ZW4gdGltZS5cbiAqXG4gKiBAcGFyYW0gZGVsYXkgLSBUaGUgdGltZSBpbiBtaWxsaXNlY29uZHMgdG8gd2FpdCBiZWZvcmUgYWJvcnRpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFib3J0QWZ0ZXIoZGVsYXk6IG51bWJlcik6IFtBYm9ydENvbnRyb2xsZXIsIEFib3J0U2lnbmFsXSB7XG4gIGNvbnN0IGFjID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiBhYy5hYm9ydCgpLCBkZWxheSk7XG4gIGFjLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsICgpID0+IGNsZWFyVGltZW91dCh0aW1lb3V0KSk7XG4gIHJldHVybiBbYWMsIGFjLnNpZ25hbF07XG59IiwgIlxuXG5cblxuXG5cbmV4cG9ydCBjb25zdCB2ZXJzaW9uID0gLyogQF9fTUFDUk9fXyBnZXRWZXJzaW9uICovXCI3LjIuMFwiOyJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUNNQSxJQUFBQSxzQkFBNkI7OztBQ0g3QixpQkFBK0I7QUFrQnhCLFNBQVMsOEJBQThCLFFBQW9CO0FBQ2hFLFNBQU87QUFBQSxJQUNMLElBQUksMEJBQWU7QUFBQTtBQUFBLElBRW5CLEdBQUc7QUFBQSxNQUNELFVBQVUsT0FBTztBQUFBLE1BQ2pCLFlBQVksT0FBTztBQUFBLE1BQ25CLFdBQVcsT0FBTztBQUFBLE1BQ2xCLFdBQVcsT0FBTztBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUNGO0FBWGdCO0FBY2hCLElBQU0sU0FBUyxvQkFBSSxJQUEwQztBQUM3RCxPQUFPLElBQUksV0FBVyxvQkFBSSxJQUFJLENBQUM7QUFFL0IsU0FBUyxpQkFBaUIsT0FBZTtBQUN2QyxRQUFNLFdBQVcsT0FBTyxJQUFJLEtBQUs7QUFDakMsTUFBSSxTQUFVLFFBQU87QUFDckIsUUFBTSxNQUFNLG9CQUFJLElBQTZCO0FB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QVcsT0FBK0M7QUFDeEUsUUFBTSxLQUFLLElBQUksZ0JBQWdCO0FBQy9CLFFBQU0sVUFBVSxXQUFXLE1BQU0sR0FBRyxNQUFNLEdBQUcsS0FBSztBQUNsRCxLQUFHLE9BQU8saUJBQWlCLFNBQVMsTUFBTSxhQUFhLE9BQU8sQ0FBQztBQUMvRCxTQUFPLENBQUMsSUFBSSxHQUFHLE1BQU07QUFDdkI7QUFMZ0I7OztBRG9DaEIsZUFBc0IsWUFDdEIsUUFDQSxRQUNBLGlCQUNBO0FBQ0UsTUFBSSxPQUFPLE1BQU0sV0FBVyxRQUFRO0FBQ2xDLFVBQU0sQ0FBQyxJQUFJLE1BQU0sSUFDakIsT0FBTyxvQkFBb0IsV0FDM0IsV0FBVyxlQUFlLElBQzFCLENBQUMsUUFBVyxlQUFlO0FBQzNCLFFBQUk7QUFDRixnQkFBTSwwQkFBSyxRQUF3QixRQUFRLEVBQUUsT0FBTyxDQUFDO0FBQUEsSUFDdkQsVUFBRTtBQUNBLFVBQUksTUFBTTtBQUFBLElBQ1o7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBbEJzQjs7O0FFdENmLElBQU07QUFBQTtBQUFBLEVBQXFDO0FBQUE7IiwKICAibmFtZXMiOiBbImltcG9ydF9ub2RlX2V2ZW50cyIsICJpbXBvcnRfbm9kZV9idWZmZXIiLCAiaW1wb3J0X25vZGVfZXZlbnRzIiwgImltcG9ydF92OCIsICJub25jZSIsICJjcnlwdG8iLCAiaW1wb3J0X25vZGVfYnVmZmVyIiwgImltcG9ydF9ub2RlX2V2ZW50cyIsICJpbXBvcnRfbm9kZV9idWZmZXIiLCAiTm9TdWJzY3JpYmVyQmVoYXZpb3IiLCAiQXVkaW9QbGF5ZXJTdGF0dXMiLCAiaW1wb3J0X25vZGVfYnVmZmVyIiwgImltcG9ydF9ub2RlX2V2ZW50cyIsICJpbXBvcnRfbm9kZV9idWZmZXIiLCAiaW1wb3J0X25vZGVfZXZlbnRzIiwgIldlYlNvY2tldCIsICJub25jZSIsICJjcnlwdG8iLCAic3RyaW5naWZ5U3RhdGUiLCAib3B0aW9uIiwgImNyeXB0byIsICJWb2ljZUNvbm5lY3Rpb25TdGF0dXMiLCAiVm9pY2VDb25uZWN0aW9uRGlzY29ubmVjdFJlYXNvbiIsICJTdHJlYW1UeXBlIiwgImltcG9ydF9vcHVzIiwgImltcG9ydF9lcXVhbGl6ZXIiLCAiaW1wb3J0X25vZGVfZXZlbnRzIl0KfQo=