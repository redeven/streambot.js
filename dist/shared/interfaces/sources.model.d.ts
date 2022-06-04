export declare type Source = 'twitch' | 'trovo';
export declare const SOURCE_CHOICES: Source[];
export declare type Sources = {
    [key in Source]: StreamerList;
};
export interface StreamerList {
    [key: string]: StreamerInfo;
}
export interface StreamerInfo {
    userId: string;
    displayName: string;
    lastStreamMessageId?: string;
}
