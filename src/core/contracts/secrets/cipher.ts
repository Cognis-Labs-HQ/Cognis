export interface SealedSecret {
    iv: string;
    ciphertext: string;
}

/** Private server contract; plaintext and encryption keys never cross HTTP surfaces. */
export interface SecretEncryption {
    seal(scope: string, value: string): Promise<SealedSecret>;
    open(scope: string, value: SealedSecret): Promise<string>;
}
