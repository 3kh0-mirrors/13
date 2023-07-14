import {uint32} from "./int.js";

// client ID is positive for all real users.
// NPC are using entity identifier, negative (-entity.id)
export type ClientID = uint32;
export type CallID = number;
export type MessageData = unknown;
export type MessageTypeID = number;

declare let __CLIENT_VERSION__: string;
declare let __SERVER_VERSION__: string;
declare let __BUILD_COMMIT__: string;
declare let __BUILD_HASH__: string;
declare let __SERVER_URL__: string;
declare let __POKI_GAME_ID__: string;
declare let __POKI_BUILD__: boolean;

export const BuildClientVersion = __CLIENT_VERSION__;
export const BuildServerVersion = __SERVER_VERSION__;
export const BuildHash = __BUILD_HASH__;
export const BuildCommit = __BUILD_COMMIT__;
export const ServerUrl = __SERVER_URL__;
export const PokiGameId = __POKI_GAME_ID__;
export const IsPokiBuild = __POKI_BUILD__;

export const ServerEventName = {
    Close: 0,
    Ping: 1,
    ClientInit: 2,
    ClientUpdate: 3,
    ClientListChange: 4,
} as const;
export type ServerEventName = (typeof ServerEventName)[keyof typeof ServerEventName];

export const MessageType = {
    Nop: 0,
    RtcOffer: 1,
    RtcAnswer: 2,
    RtcCandidate: 3,
    Name: 4,
    State: 5,
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageField = {
    Source: 0,
    Destination: 1,
    Type: 2,
    Call: 3,
    Data: 4,
} as const;
export type MessageField = (typeof MessageField)[keyof typeof MessageField];

export type Message = [
    // source - from
    ClientID,
    // destination - to
    ClientID,
    // type
    MessageTypeID,
    // call id
    CallID,
    // payload
    MessageData,
    // call identifier
];

export type Request = [
    // source - from
    ClientID,
    // messages array
    Message[],
];

// number of processed messages
export type PostMessagesResponse = number;

/* DTO */
export interface RoomInfo {
    code: string;
    players: number;
    max: number;
}

/* DTO */
export interface RoomsInfoResponse {
    // client version
    v: string;
    rooms: RoomInfo[];
    players: number;
}

export interface ServerInfoResponse {
    // queried instances list
    i: RoomsInfoResponse[];
}

export const GameModeFlag = {
    Public: 1,
    Coop: 2,
    Timer: 4,
    Offline: 1 << 16,
} as const;
export type GameModeFlag = (typeof GameModeFlag)[keyof typeof GameModeFlag];

export interface NewGameParams {
    _flags: number;
    _playersLimit: number;
    _npcLevel: number;
    _theme: number;
}
