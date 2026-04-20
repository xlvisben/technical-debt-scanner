import * as vscode from 'vscode';

export type debtMatrixQuadrant = {
    shortDescription: string,
    explanation: string,
    context: string,
};

export interface FoundMatch {
    debtQuadrant: number,
    label: string;
    uri: vscode.Uri;
    line: number;
    column: number;
}