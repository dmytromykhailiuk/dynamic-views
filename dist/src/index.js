"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicViews = exports.NestedForm = exports.RepeatedView = exports.FieldResolver = exports.useDynamicViews = void 0;
const react_1 = __importStar(require("react"));
const reactive_react_1 = require("@dmytromykhailiuk/reactive-react");
const react_hook_form_1 = require("react-hook-form");
const updateNameWithNestedValue = (name, nestedValue = '') => {
    switch (true) {
        case !nestedValue && !!name: {
            return typeof name === 'number' ? `[${name}]` : name;
        }
        case !!nestedValue && !!name: {
            return nestedValue + (typeof name === 'number' ? `[${name}]` : `.${name}`);
        }
        case !!nestedValue && !name: {
            return nestedValue;
        }
        default: {
            return '';
        }
    }
};
const getValueByPath = ({ path, object }) => {
    const {} = { path, object };
    try {
        const value = eval(`(${JSON.stringify(object)}).${path}`);
        return value;
    }
    catch {
        return undefined;
    }
};
const checkIfExist = ({ path, object }) => {
    const {} = { path, object };
    try {
        const isExist = Boolean(eval(`(${JSON.stringify(object)}).${path}`));
        return isExist;
    }
    catch {
        return false;
    }
};
const updateObjectWithNewValueByPath = ({ path, object, value }) => {
    const {} = { path, object };
    try {
        const newObject = eval(`(() => {
      const object = ${JSON.stringify(object)};

      object.${path} = ${JSON.stringify(value)};

      return object;
    })()`);
        return newObject;
    }
    catch (e) {
        return object;
    }
};
const getAllRootFieldsFromChildren = (children, fields = []) => {
    return children.reduce((acc, view) => {
        if (view.name) {
            acc.push(view);
            return acc;
        }
        if (view.children) {
            view.children.forEach(() => getAllRootFieldsFromChildren(view.children, acc));
        }
        return acc;
    }, fields);
};
const getDefaultValuesForView = (view) => {
    if (view.defaultValue) {
        return view.defaultValue;
    }
    if (view.resetValue) {
        return view.resetValue;
    }
    if (view.repeatedView) {
        return [];
    }
    if (!view.children) {
        return '';
    }
    return getAllRootFieldsFromChildren(view.children).reduce((acc, view) => ({ ...acc, [view.name]: getDefaultValuesForView(view) }), {});
};
const checkIfEqualByPath = ({ path, object1, object2 }) => {
    const {} = { path, object1, object2 };
    try {
        const isEqual = eval(`JSON.stringify((${JSON.stringify(object1)}).${path}) === JSON.stringify((${JSON.stringify(object2)}).${path})`);
        return isEqual;
    }
    catch {
        return false;
    }
};
const setupCurrentView = (view, fieldPath) => ({
    hide: false,
    ...view,
    fieldPath,
});
const runExpression = (expression, model, sharedData, currentView) => {
    const {} = { model, sharedData, currentView };
    return eval(expression);
};
const updateObjectByPath = (object, path, newValue, mainObject = object) => {
    if (path.length === 1) {
        object[path[0]] = newValue;
        return mainObject;
    }
    return updateObjectByPath(object[path[0]], path.slice(1), newValue, mainObject);
};
const DynamicViewsContext = (0, react_1.createContext)(null);
const useDynamicViews = () => (0, react_1.useContext)(DynamicViewsContext);
exports.useDynamicViews = useDynamicViews;
exports.FieldResolver = (0, react_1.memo)(({ view, name }) => {
    const [currentView, updateCurrentView] = (0, react_1.useState)(setupCurrentView(view, name));
    const { form, sharedData, model, submit, TYPES, VALIDATORS, ASYNC_VALIDATORS, EXTENSIONS } = (0, exports.useDynamicViews)();
    const expressionsCallback = (0, react_1.useCallback)(() => {
        const modelValue = model.value;
        const sharedDataValue = sharedData.value;
        const newView = Object.entries(currentView.expressions || {}).reduce((object, [path, expression]) => {
            const newValue = runExpression(expression, modelValue, sharedDataValue, currentView);
            return updateObjectByPath(object, path.split('.'), newValue);
        }, JSON.parse(JSON.stringify(currentView)));
        if (newView !== currentView && JSON.stringify(newView) !== JSON.stringify(currentView)) {
            updateCurrentView(newView);
        }
    }, [sharedData, model, currentView, updateCurrentView]);
    (0, react_1.useMemo)(expressionsCallback, []);
    (0, react_1.useMemo)(() => {
        (currentView.extensions || []).forEach((extension) => {
            if (!EXTENSIONS[extension]) {
                throw new Error(`Extension ${extension} was not defined!`);
            }
            EXTENSIONS[extension]({ currentView, updateCurrentView });
        });
    }, []);
    (0, react_1.useEffect)(() => model.subscribe(expressionsCallback), [sharedData, model, currentView, updateCurrentView, expressionsCallback]);
    (0, react_1.useEffect)(() => sharedData.subscribe(expressionsCallback), [sharedData, model, currentView, updateCurrentView, expressionsCallback]);
    (0, react_1.useEffect)(() => {
        if (currentView.hide && currentView?.resetOnHide && currentView?.resetValue !== form.getValues(name)) {
            setTimeout(() => form.setValue(name, (currentView.resetValue ?? '')));
        }
    }, [currentView, form, name]);
    (0, react_1.useEffect)(() => {
        if (!currentView.defaultValue && !checkIfExist({ path: name, object: model.value })) {
            return;
        }
        const newModel = updateObjectWithNewValueByPath({
            path: name,
            object: model.value,
            value: getValueByPath({ path: name, object: model.value }) || currentView.defaultValue,
        });
        model.value = newModel;
        model.trigger();
    }, [form, model, name, currentView.defaultValue, expressionsCallback]);
    (0, react_1.useEffect)(() => {
        const sub = form.watch((value, { name: fieldName, type }) => {
            if (fieldName !== name || type !== 'change') {
                return;
            }
            if (!checkIfEqualByPath({
                path: name,
                object1: model.value,
                object2: value,
            })) {
                model.value = value;
            }
        });
        return () => sub.unsubscribe();
    }, [form, model, name]);
    const rules = (0, react_1.useMemo)(() => ({
        ...(currentView.rules || {}),
        validate: {
            ...(currentView.validators || []).reduce((acc, key) => !VALIDATORS[key]
                ? acc
                : {
                    ...acc,
                    [key]: (value) => VALIDATORS[key]({
                        name,
                        validator: key,
                        value,
                        view: currentView,
                        setError: (message = '') => {
                            if (!form.formState.errors[name]) {
                                form.setError(name, { type: key, message });
                            }
                        },
                        sharedData: sharedData.value,
                        model: model.value,
                    }),
                }, {}),
            ...(currentView.asyncValidators || []).reduce((acc, key) => !ASYNC_VALIDATORS[key]
                ? acc
                : {
                    ...acc,
                    [key]: (value) => ASYNC_VALIDATORS[key]({
                        name,
                        validator: key,
                        value,
                        view: currentView,
                        setError: (message = '') => {
                            if (!form.formState.errors[name]) {
                                form.setError(name, { type: key, message });
                            }
                        },
                        sharedData: sharedData.value,
                        model: model.value,
                    }),
                }, {}),
        },
    }), [currentView.rules, currentView.validators, currentView.asyncValidators]);
    if (currentView.hide) {
        return null;
    }
    switch (true) {
        case Boolean(currentView.children): {
            const content = react_1.default.createElement(exports.NestedForm, { name: name, views: currentView.children });
            if (!currentView.type) {
                return content;
            }
            const DynamicComponent = TYPES[currentView.type];
            if (!DynamicComponent) {
                throw new Error(`Type ${currentView.type} was not defined!`);
            }
            return (react_1.default.createElement(DynamicComponent, { name: name, view: currentView, form: form, sharedData: sharedData, model: model, submit: submit }, content));
        }
        case Boolean(currentView.repeatedView): {
            return react_1.default.createElement(exports.RepeatedView, { name: name, view: currentView });
        }
        case Boolean(currentView.type): {
            const DynamicComponent = TYPES[currentView.type];
            if (!DynamicComponent) {
                throw new Error(`Type ${currentView.type} was not defined!`);
            }
            if (!currentView.name) {
                return (react_1.default.createElement(DynamicComponent, { name: name, view: currentView, form: form, sharedData: sharedData, model: model, submit: submit }));
            }
            const FieldDynamicComponent = DynamicComponent;
            return (react_1.default.createElement(react_hook_form_1.Controller, { name: name, control: form.control, defaultValue: currentView.defaultValue, rules: rules, render: ({ field }) => {
                    console.log(name + ' render');
                    return (react_1.default.createElement(FieldDynamicComponent, { name: name, view: currentView, field: field, form: form, sharedData: sharedData, model: model, submit: submit }));
                } }));
        }
        default: {
            throw new Error(`Invalid view structure! ${JSON.stringify(currentView)}`);
        }
    }
});
exports.RepeatedView = (0, react_1.memo)(({ name, view }) => {
    const { form, sharedData, model, submit, TYPES } = (0, exports.useDynamicViews)();
    const { fields: dataArray, append, remove, } = (0, react_hook_form_1.useFieldArray)({
        control: form.control,
        name: name,
    });
    const updatedAppend = (0, react_1.useCallback)((value) => append(value ?? getDefaultValuesForView(view.repeatedView)), [append, view]);
    (0, react_1.useEffect)(() => {
        const modelValues = model.value;
        const formValues = form.getValues();
        if (!checkIfEqualByPath({
            path: name,
            object1: modelValues,
            object2: formValues,
        })) {
            model.value = formValues;
        }
    }, [form, model, dataArray, name]);
    const content = (react_1.default.createElement(react_1.default.Fragment, null, (dataArray || []).map((_, id) => (react_1.default.createElement(exports.FieldResolver, { key: id, name: updateNameWithNestedValue(String(id), name), view: view.repeatedView })))));
    if (!view.type) {
        return content;
    }
    const DynamicComponent = TYPES[view.type];
    if (!DynamicComponent) {
        throw new Error(`Type ${view.type} was not defined!`);
    }
    return (react_1.default.createElement(DynamicComponent, { dataArray: dataArray, name: name, view: view, append: updatedAppend, remove: remove, renderRepeatedViewByIndex: (index) => react_1.default.createElement(exports.FieldResolver, { name: updateNameWithNestedValue(String(index), name), view: view.repeatedView }), form: form, sharedData: sharedData, model: model, submit: submit }, content));
});
exports.NestedForm = (0, react_1.memo)(({ views, name }) => {
    return (react_1.default.createElement(react_1.default.Fragment, null, views.map((view, id) => (react_1.default.createElement(exports.FieldResolver, { key: `${id}-${view.type}-${view.name}`, name: updateNameWithNestedValue(view.name, name), view: view })))));
});
const createDynamicViews = ({ types = {}, validators = {}, asyncValidators = {}, extensions = {} } = {}) => {
    const TYPES = types;
    const VALIDATORS = validators;
    const ASYNC_VALIDATORS = asyncValidators;
    const EXTENSIONS = extensions;
    const Component = ({ views, model = null, sharedData = null, onSubmit = () => { } }) => {
        const defaultModel = (0, reactive_react_1.useSignal)({});
        const defaultSharedData = (0, reactive_react_1.useSignal)({});
        const form = (0, react_hook_form_1.useForm)({
            defaultValues: (model || defaultModel).value,
            mode: 'all',
        });
        const submit = (0, react_1.useCallback)(() => form.handleSubmit(onSubmit)(), [form, onSubmit]);
        const updateFormWithModel = (0, react_1.useCallback)(() => {
            const modelValue = (model || defaultModel).value;
            const formValue = form.getValues();
            if (JSON.stringify(formValue) !== JSON.stringify(modelValue)) {
                form.reset(modelValue, {
                    keepTouched: true,
                    keepDirty: true,
                });
            }
        }, [model, form, defaultModel]);
        (0, react_1.useEffect)(() => {
            if (!model) {
                return;
            }
            updateFormWithModel();
            return (model || defaultModel).subscribe(updateFormWithModel);
        }, [model, form, defaultModel, updateFormWithModel]);
        const dynamicViewsContextValue = (0, react_1.useMemo)(() => ({
            model: model || defaultModel,
            form,
            sharedData: sharedData || defaultSharedData,
            submit,
            TYPES,
            VALIDATORS,
            ASYNC_VALIDATORS,
            EXTENSIONS,
        }), [model, defaultModel, form, sharedData, defaultSharedData, submit]);
        return (react_1.default.createElement(react_hook_form_1.FormProvider, { ...form },
            react_1.default.createElement(DynamicViewsContext.Provider, { value: dynamicViewsContextValue },
                react_1.default.createElement(exports.NestedForm, { views: views, name: '' }))));
    };
    Component.defineTypes = (types) => {
        types.forEach(({ name, item: component }) => {
            TYPES[name] = component;
        });
    };
    Component.defineValidators = (validators) => {
        validators.forEach(({ name, item: validator }) => {
            VALIDATORS[name] = validator;
        });
    };
    Component.defineAsyncValidators = (validators) => {
        validators.forEach(({ name, item: asyncValidator }) => {
            ASYNC_VALIDATORS[name] = asyncValidator;
        });
    };
    Component.defineExtensions = (extensions) => {
        extensions.forEach(({ name, item: extension }) => {
            EXTENSIONS[name] = extension;
        });
    };
    return Component;
};
exports.createDynamicViews = createDynamicViews;
//# sourceMappingURL=index.js.map