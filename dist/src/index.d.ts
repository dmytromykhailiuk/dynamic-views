import React, { JSXElementConstructor, ReactElement } from 'react';
import { Signal } from '@dmytromykhailiuk/reactive';
import { UseFormReturn, ControllerRenderProps, UseFieldArrayRemove } from 'react-hook-form';
export interface Dictionary<T> {
    [key: string]: T;
}
interface CreateDynamicViewsInput {
    types?: Dictionary<TypeComponent>;
    validators?: Dictionary<ValidatorFunction>;
    asyncValidators?: Dictionary<AsyncValidatorFunction>;
    extensions?: Dictionary<ExtensionFunction>;
}
interface DynamicViewsComponentInput {
    views: View[];
    onSubmit?: (_: Dictionary<any>) => void;
    model?: Signal<Dictionary<any>>;
    sharedData?: Signal<Dictionary<any>>;
}
interface BasicView {
    type?: string;
    hide?: boolean;
    props?: {
        [key: string]: any;
    };
    expressions?: {
        [key: string]: string;
    };
    extensions?: Array<string>;
}
interface FieldView<T = any> extends BasicView {
    name: string;
    defaultValue?: T;
    resetValue?: T;
    resetOnHide?: boolean;
    rules?: {
        [key: string]: any;
    };
    validators?: Array<string>;
    asyncValidators?: Array<string>;
}
interface WithChildren {
    children: Array<View>;
}
interface WithRepeatedView {
    repeatedView: View;
}
interface Default {
}
export type View<T = any> = (BasicView | FieldView<T>) & (WithChildren | WithRepeatedView | Default);
type ViewWithFieldPath<T = any> = View<T> & {
    fieldPath: string;
};
type MemorizedElement = ReactElement<any, string | JSXElementConstructor<any>> | null;
export interface BasicTypeComponentInput {
    children?: JSX.Element | MemorizedElement;
    name: string;
    view: any;
    form: UseFormReturn<{}, any, undefined>;
    sharedData: Signal<Dictionary<any>>;
    model: Signal<Dictionary<any>>;
    submit: () => Promise<void>;
}
export type BasicTypeComponent = (input: BasicTypeComponentInput) => JSX.Element | MemorizedElement;
export interface FieldTypeComponentInput extends BasicTypeComponentInput {
    field: ControllerRenderProps<{}, never>;
}
export type FieldTypeComponent = (input: FieldTypeComponentInput) => JSX.Element | MemorizedElement;
export interface TypeComponentWithRepeatedViewInput<T = any> extends BasicTypeComponentInput {
    dataArray: Record<'id', string>[];
    append: (value: T) => void;
    remove: UseFieldArrayRemove;
    renderRepeatedViewByIndex: (index: number) => JSX.Element | MemorizedElement;
}
export type TypeComponentWithRepeatedView = (input: TypeComponentWithRepeatedViewInput) => JSX.Element | MemorizedElement;
export type TypeComponent = TypeComponentWithRepeatedView | FieldTypeComponent | BasicTypeComponent;
export interface ValidatorFunctionInput<T = any> {
    name: string;
    validator: string;
    value: T;
    view: ViewWithFieldPath;
    setError: (message: string) => void;
    sharedData: Dictionary<any>;
    model: Dictionary<any>;
}
export type ValidatorFunction = (input: ValidatorFunctionInput) => string | boolean;
export type AsyncValidatorFunction = (input: ValidatorFunctionInput) => Promise<string | boolean>;
export interface ExtensionFunctionInput {
    currentView: ViewWithFieldPath;
    updateCurrentView: (input: ViewWithFieldPath | ((prevView: ViewWithFieldPath) => ViewWithFieldPath)) => void;
}
export type ExtensionFunction = (input: ExtensionFunctionInput) => void;
export interface ContextValue {
    model: Signal<Dictionary<any>>;
    form: UseFormReturn<{}, any, undefined>;
    sharedData: Signal<Dictionary<any>>;
    submit: () => Promise<void>;
    TYPES: Dictionary<TypeComponent>;
    VALIDATORS: Dictionary<ValidatorFunction>;
    ASYNC_VALIDATORS: Dictionary<AsyncValidatorFunction>;
    EXTENSIONS: Dictionary<ExtensionFunction>;
}
export interface DefinitionItem<T> {
    name: string;
    item: T;
}
export declare const useDynamicViews: () => ContextValue;
export declare const FieldResolver: React.NamedExoticComponent<{
    view: View;
    name: string;
}>;
export declare const RepeatedView: React.NamedExoticComponent<{
    view: View;
    name: string;
}>;
export declare const NestedForm: React.NamedExoticComponent<{
    views: View[];
    name: string;
}>;
export declare const createDynamicViews: ({ types, validators, asyncValidators, extensions }?: CreateDynamicViewsInput) => {
    ({ views, model, sharedData, onSubmit }: DynamicViewsComponentInput): React.JSX.Element;
    defineTypes(types: Array<DefinitionItem<TypeComponent>>): void;
    defineValidators(validators: Array<DefinitionItem<ValidatorFunction>>): void;
    defineAsyncValidators(validators: Array<DefinitionItem<AsyncValidatorFunction>>): void;
    defineExtensions(extensions: Array<DefinitionItem<ExtensionFunction>>): void;
};
export {};
