import { debtMatrixQuadrant } from "./types";

export const TECHDEBTMATRIX: debtMatrixQuadrant[] = [
    {
        shortDescription: 'Deliberate and Reckless',
        explanation: 'We do not have time for design',
        context: 'Concious choice',
    },
    {
        shortDescription: 'Deliberate and Prudent',
        explanation: 'We must ship now and deal with consequences later',
        context: 'Business decision',
    },
    {
        shortDescription: 'Inadvertent and Reckless',
        explanation: 'What is technology X?',
        context: 'Lack of skills and awareness',
    },
    {
        shortDescription: 'Inadvertent and Prudent',
        explanation: 'Now we know how we should have done it',
        context: 'Ok with it',
    }
];

export const TRIGGER_STRING = "// TD:";