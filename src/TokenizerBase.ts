import { Token } from "./Token";
import { TokenType } from "./TokenType";

export const BR = "\n";
export const EOL = ["\n", "\0"];
export const EOF = "\0";
export const SPACE = [" ", "\t"];
export const DASH = ["-", "–", "—"];

export type match = string | string[] | undefined;

export function flattenMatchesToArray(matches: match[]): string[] {
	const flatMatches: string[] = [];

	for (const match of matches) {
		if (match instanceof Array) {
			flatMatches.push(...match);
		} else if (match !== undefined) {
			flatMatches.push(match);
		}
	}

	return flatMatches;
}

/**
 * Returns true if the character is a space or tab.
 * @param c The character to check
 * @returns True if the character is a space or tab.
 */
export function isSpace(c: string | undefined): boolean {
	return c === " " || c === "\t";
}

/**
 * Returns true if the character is a letter. Does not include dashes or underscores.
 * @param c The character to check
 * @returns True if the character is a letter. Does not include dashes or underscores.
 */
export function isAlpha(c: string | undefined): boolean {
	return (
		c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"))
	);
}

/**
 * Returns true if the character is a number. Does not include dashes, minus signs, or plus signs.
 * @param c The character to check
 * @returns True if the character is a number. Does not include dashes, minus signs, or plus signs.
 */
export function isNumber(c: string | undefined): boolean {
	return c !== undefined && c >= "0" && c <= "9";
}

/**
 * Returns true if the character is a letter, number, dash, or underscore.
 * @param c The character to check
 * @returns True if the character is a letter, number, dash, or underscore.
 */
export function isAlphaNumeric(c: string | undefined): boolean {
	return isAlpha(c) || isNumber(c) || c === "." || c === "+" || c === "-";
}

/**
 * A simple function to join an array of strings with newlines.
 * @param lines The lines to join.
 * @returns
 */
export function nl(...lines: string[]): string {
	return lines.join("\n");
}

export abstract class TokenizerBase {
	protected source: string;
	protected char: string = "";
	protected queuedIndex = 0;
	protected cursorIndex = 0;
	protected tokens: Token[] = [];

	protected line = 0;
	protected column = 0;

	constructor(source: string) {
		this.source = source;
		this.moveCursor(0);
	}

	/**
	 *
	 * @param type TokenType The type of token to add.
	 * @param literal The literal value of the token. Defaults to the lexeme.
	 * @returns void
	 *
	 * @example
	 * this.addToken(TokenType.SYMBOL, "foo");
	 * this.addToken(TokenType.NUMBER, 1);
	 * this.addToken(TokenType.SPACE);
	 * this.addToken(TokenType.BR);
	 * this.addToken(TokenType.RUNE, "foo#")
	 */
	protected add(type: TokenType, literal: any = undefined): void {
		const lexeme = this.getQueuedChars();
		const literalValue = literal === undefined ? lexeme : literal;
		this.tokens.push(
			new Token(type, lexeme, literalValue, this.line, this.column)
		);
		this.column += lexeme.length;
		this.clearQueuedChars();
	}

	/**
	 * Returns the character at the given index, or the default character if the index is out of bounds.
	 * @param index The index of the character to return.
	 * @param defaultChar The default character to return if the index is out of bounds.
	 * @returns The character at the given index, or the default character if the index is out of bounds.
	 */
	protected charAt(index: number, defaultChar: string = EOF): string {
		return (this.source[index] ? this.source[index] : defaultChar) || EOF;
	}

	/**
	 * Returns the next sequence of characters.
	 * @param len The number of characters to return.
	 * @returns The next sequence of characters.
	 */
	protected chars(len: number): string {
		return (
			this.source.slice(this.cursorIndex, this.cursorIndex + len) || EOF
		);
	}

	/**
	 * Clears the queued characters.
	 * abcdefghijklmnopqrstuvwxyz
	 *    ^ cursor is here
	 *      accrued chars = "abcd"
	 *      peak = "e"
	 *
	 * clearQueuedChars()
	 *
	 * abcdefghijklmnopqrstuvwxyz
	 *     ^ cursor is here
	 *      accrued chars = "e"
	 *      peak = "f"
	 */
	protected clearQueuedChars(): string {
		const queuedChars = this.getQueuedChars();
		this.cursorIndex++;
		this.queuedIndex = this.cursorIndex;
		this.char = this.charAt(this.cursorIndex, EOF);
		return queuedChars;
	}

	/**
	 * Returns the characters before the cursor (including the cursor) that have
	 * @returns The characters before the cursor (including the cursor) that have
	 * not yet been parsed and transformed into tokens.
	 */
	protected getQueuedChars(): string {
		return this.source.slice(this.queuedIndex, this.cursorIndex + 1);
	}

	/**
	 * Returns true if the next sequence of characters is the given character or string.
	 * @param c The character or string to check for.
	 * @returns True if the next sequence of characters is the given character or string.
	 */
	protected is(...matches: match[]): boolean {
		for (const match of flattenMatchesToArray(matches)) {
			if (this.chars(match.length) === match) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Moves the cursor forward by the given number of characters.
	 * abcdefghijklmnopqrstuvwxyz
	 * ^ cursor is here
	 *   accrued chars = "a"
	 *   peak = "b"
	 *
	 * moveCursor(2)
	 * abcdefghijklmnopqrstuvwxyz
	 *   ^ cursor is here
	 *     accrued chars = "abc"
	 *     peak = "d"
	 * @param offset Positive number of characters to move the cursor forward.
	 */
	protected moveCursor(offset: number): this {
		if (offset < 0) throw new Error("Cannot move cursor backwards");

		this.cursorIndex += offset;
		this.char = this.charAt(this.cursorIndex, EOF);
		return this;
	}

	/**
	 * Continues advancing the cursor until the next character is the end of the line.
	 */
	protected moveCursorToEndOfLine(): void {
		this.nextUntil(...EOL, EOF);
	}

	/**
	 * Move the cursor forward one character.
	 */
	protected next(): this {
		this.moveCursor(1);
		return this;
	}

	/**
	 * Returns true if the next character is the given character or string.
	 * @param match The character or string to check for.
	 * @returns True if the next character is the given character or string.
	 */
	protected nextIs(...matches: match[]): boolean {
		return (
			flattenMatchesToArray(matches).filter((match) => {
				// this.nextIs(char)).length > 0;
				return match !== undefined && this.peak(match.length) === match;
			}).length > 0
		);
	}

	/**
	 * Continues advancing the cursor until the next character is one of the given characters.
	 * @param match The characters to check for.
	 */
	protected nextUntil(...matches: match[]): void {
		while (!this.nextIs(...matches)) {
			this.next();
		}
	}

	/**
	 * Continues advancing the cursor until the next character is one of the given
	 * characters or the end of the line or the end of the file.
	 * @param match The characters to check for.
	 */
	protected nextOnLineUntil(...matches: match[]): void {
		return this.nextUntil(...matches, ...EOL, EOF);
	}

	/**
	 * Returns the characters ahead of the cursor.
	 * @param len The number of characters to peak ahead.
	 * @returns The characters ahead of the cursor.
	 */
	protected peak(len = 1): string {
		if (this.cursorIndex + 1 + len > this.source.length) return EOF;

		return this.source.slice(
			this.cursorIndex + 1,
			this.cursorIndex + 1 + len
		);
	}

	/**
	 * Tokenizes the source string.
	 */
	public abstract tokenize(): Token[];

	/**
	 * Scans the char and sets the literal value to the count of characters found
	 * @param char The character to scan for.
	 * @param tokenType
	 */
	protected scanRepeatedChar(char: match, tokenType: TokenType): void {
		if (!this.is(char)) return;

		let charCount = 1;

		while (this.nextIs(char)) {
			charCount++;
			this.next();
		}

		this.add(tokenType, charCount);
	}

	/**
	 * Scans the source string for spaces and adds them to the token list.
	 */
	protected scanSpaces() {
		this.scanRepeatedChar(SPACE, TokenType.SPACE);
		// if (this.is(SPACE)) {
		// 	let spaceCount = 1;

		// 	while (this.nextIs(SPACE)) {
		// 		spaceCount++;
		// 		this.next();
		// 	}
		// 	this.add(TokenType.SPACE, spaceCount);
		// }
	}

	/**
	 * Scans the source string for newlines and adds them to the token list.
	 */
	protected scanBrs() {
		if (this.is(BR)) {
			let lineCount = 1;

			while (this.nextIs(BR)) {
				this.next();
				lineCount++;
			}

			this.add(TokenType.BR, lineCount);
			this.line += lineCount;
			this.column = 0;
		}
	}

	/**
	 * Tokenizes the queued characters using the given tokenizer.
	 * @param tokenizer The tokenizer to use to tokenize the queued characters.
	 */
	protected tokenizeQueuedChars(
		tokenizer: new (source: string) => TokenizerBase
	): void {
		const source = this.clearQueuedChars();
		const subtokenizer = new tokenizer(source);
		this.tokens.push(...subtokenizer.tokenize());
	}

	/**
	 * Returns the source string.
	 * @returns The source string.
	 */
	toString(): string {
		return this.source;
	}
}
