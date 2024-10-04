import React, { createContext, JSXElementConstructor, memo, ReactElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSignal } from '@dmytromykhailiuk/reactive-react';
import { Signal } from '@dmytromykhailiuk/reactive';
import {
  useForm,
  useFieldArray,
  FormProvider,
  Controller,
  UseFormReturn,
  ControllerRenderProps, UseFieldArrayRemove,
} from 'react-hook-form';

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

interface Default {}

export type View<T = any> = (BasicView | FieldView<T>) & (WithChildren | WithRepeatedView | Default);

type ViewWithFieldPath<T = any> = View<T> & { fieldPath: string };

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
  field: ControllerRenderProps<{}, never>
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
  sharedData: Dictionary<any>,
  model: Dictionary<any>,
}

export type ValidatorFunction = (input: ValidatorFunctionInput) => string | boolean;

export type AsyncValidatorFunction = (input: ValidatorFunctionInput) => Promise<string | boolean>;

export interface ExtensionFunctionInput {
  currentView: ViewWithFieldPath,
  updateCurrentView: (input: ViewWithFieldPath | ((prevView: ViewWithFieldPath) => ViewWithFieldPath)) => void
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
  EXTENSIONS: Dictionary<ExtensionFunction>
}

export interface DefinitionItem<T> {
  name: string;
  item: T;
}

const updateNameWithNestedValue = (name: number | string | undefined, nestedValue = ''): string => {
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
  } catch {
    return undefined;
  }
};

const checkIfExist = ({ path, object }) => {
  const {} = { path, object };

  try {
    const isExist = Boolean(eval(`(${JSON.stringify(object)}).${path}`));

    return isExist;
  } catch {
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
  } catch (e) {
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
  return getAllRootFieldsFromChildren(view.children).reduce(
    (acc, view) => ({ ...acc, [view.name]: getDefaultValuesForView(view) }),
    {},
  );
};

const checkIfEqualByPath = ({ path, object1, object2 }) => {
  const {} = { path, object1, object2 };

  try {
    const isEqual = eval(
      `JSON.stringify((${JSON.stringify(object1)}).${path}) === JSON.stringify((${JSON.stringify(object2)}).${path})`,
    );

    return isEqual;
  } catch {
    return false;
  }
};

const setupCurrentView = (view, fieldPath): ViewWithFieldPath => ({
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

const DynamicViewsContext = createContext<ContextValue>(null);

export const useDynamicViews = () => useContext(DynamicViewsContext);

export const FieldResolver = memo<{ view: View; name: string }>(({ view, name }) => {
  const [currentView, updateCurrentView] = useState(setupCurrentView(view, name));

  const { form, sharedData, model, submit, TYPES, VALIDATORS, ASYNC_VALIDATORS, EXTENSIONS } = useDynamicViews();

  const expressionsCallback = useCallback(() => {
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

  useMemo(expressionsCallback, []);

  useMemo(() => {
    (currentView.extensions || []).forEach((extension) => {
      if (!EXTENSIONS[extension]) {
        throw new Error(`Extension ${extension} was not defined!`);
      }
      EXTENSIONS[extension]({ currentView, updateCurrentView });
    });
  }, []);

  useEffect(
    () => model.subscribe(expressionsCallback),
    [sharedData, model, currentView, updateCurrentView, expressionsCallback],
  );

  useEffect(
    () => sharedData.subscribe(expressionsCallback),
    [sharedData, model, currentView, updateCurrentView, expressionsCallback],
  );

  useEffect(() => {
    if (currentView.hide && (currentView as FieldView)?.resetOnHide && (currentView as FieldView)?.resetValue !== form.getValues(name as never)) {
      setTimeout(() => form.setValue(name as never, ((currentView as FieldView).resetValue ?? '') as never));
    }
  }, [currentView, form, name]);

  useEffect(() => {
    if (!(currentView as FieldView).defaultValue && !checkIfExist({ path: name, object: model.value })) {
      return;
    }
    const newModel = updateObjectWithNewValueByPath({
      path: name,
      object: model.value,
      value: getValueByPath({ path: name, object: model.value }) || (currentView as FieldView).defaultValue,
    });

    model.value = newModel;
    model.trigger();
  }, [form, model, name, (currentView as FieldView).defaultValue, expressionsCallback]);

  useEffect(() => {
    const sub = form.watch((value, { name: fieldName, type }) => {
      if (fieldName !== name || type !== 'change') {
        return;
      }
      if (
        !checkIfEqualByPath({
          path: name,
          object1: model.value,
          object2: value,
        })
      ) {
        model.value = value;
      }
    });

    return () => sub.unsubscribe();
  }, [form, model, name]);

  const rules = useMemo(
    () => ({
      ...((currentView as FieldView).rules || {}),
      validate: {
        ...((currentView as FieldView).validators || []).reduce(
          (acc, key) =>
            !VALIDATORS[key]
              ? acc
              : {
                  ...acc,
                  [key]: (value) =>
                    VALIDATORS[key]({
                      name,
                      validator: key,
                      value,
                      view: currentView,
                      setError: (message = '') => {
                        if (!form.formState.errors[name]) {
                          form.setError(name as any, { type: key, message });
                        }
                      },
                      sharedData: sharedData.value,
                      model: model.value,
                    }),
                },
          {},
        ),
        ...((currentView as FieldView).asyncValidators || []).reduce(
          (acc, key) =>
            !ASYNC_VALIDATORS[key]
              ? acc
              : {
                  ...acc,
                  [key]: (value) =>
                    ASYNC_VALIDATORS[key]({
                      name,
                      validator: key,
                      value,
                      view: currentView,
                      setError: (message = '') => {
                        if (!form.formState.errors[name]) {
                          form.setError(name as any, { type: key, message });
                        }
                      },
                      sharedData: sharedData.value,
                      model: model.value,
                    }),
                },
          {},
        ),
      },
    }),
    [(currentView as FieldView).rules, (currentView as FieldView).validators, (currentView as FieldView).asyncValidators],
  );

  if (currentView.hide) {
    return null;
  }

  switch (true) {
    case Boolean((currentView as WithChildren).children): {
      const content = <NestedForm name={name} views={(currentView as WithChildren).children} />;

      if (!currentView.type) {
        return content;
      }

      const DynamicComponent = TYPES[currentView.type] as BasicTypeComponent;

      if (!DynamicComponent) {
        throw new Error(`Type ${currentView.type} was not defined!`);
      }

      return (
        <DynamicComponent
          name={name}
          view={currentView}
          form={form}
          sharedData={sharedData}
          model={model}
          submit={submit}
        >
          {content}
        </DynamicComponent>
      );
    }
    case Boolean((currentView as WithRepeatedView).repeatedView): {
      return <RepeatedView name={name} view={currentView} />;
    }
    case Boolean(currentView.type): {
      const DynamicComponent = TYPES[currentView.type] as BasicTypeComponent;

      if (!DynamicComponent) {
        throw new Error(`Type ${currentView.type} was not defined!`);
      }

      if (!(currentView as FieldView).name) {
        return (
          <DynamicComponent
            name={name}
            view={currentView}
            form={form}
            sharedData={sharedData}
            model={model}
            submit={submit}
          />
        );
      }

      const FieldDynamicComponent: FieldTypeComponent = DynamicComponent;

      return (
        <Controller
          name={name as never}
          control={form.control}
          defaultValue={(currentView as FieldView).defaultValue as never}
          rules={rules}
          render={({ field }) => {
            console.log(name + ' render');

            return (
              <FieldDynamicComponent
                name={name}
                view={currentView}
                field={field}
                form={form}
                sharedData={sharedData}
                model={model}
                submit={submit}
              />
            );
          }}
        />
      );
    }
    default: {
      throw new Error(`Invalid view structure! ${JSON.stringify(currentView)}`);
    }
  }
});

export const RepeatedView = memo<{ view: View; name: string }>(({ name, view }) => {
  const { form, sharedData, model, submit, TYPES } = useDynamicViews();

  const {
    fields: dataArray,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: name as never,
  });

  const updatedAppend = useCallback(
    (value) => append(value ?? getDefaultValuesForView((view as WithRepeatedView).repeatedView)),
    [append, view],
  );

  useEffect(() => {
    const modelValues = model.value;
    const formValues = form.getValues();

    if (
      !checkIfEqualByPath({
        path: name,
        object1: modelValues,
        object2: formValues,
      })
    ) {
      model.value = formValues;
    }
  }, [form, model, dataArray, name]);

  const content = (
    <>
      {(dataArray || []).map((_, id) => (
        <FieldResolver key={id} name={updateNameWithNestedValue(String(id), name)} view={(view as WithRepeatedView).repeatedView} />
      ))}
    </>
  );

  if (!view.type) {
    return content;
  }

  const DynamicComponent = TYPES[view.type] as TypeComponentWithRepeatedView;

  if (!DynamicComponent) {
    throw new Error(`Type ${view.type} was not defined!`);
  }

  return (
    <DynamicComponent
      dataArray={dataArray}
      name={name}
      view={view}
      append={updatedAppend}
      remove={remove}
      renderRepeatedViewByIndex={(index: number) => <FieldResolver
        name={updateNameWithNestedValue(String(index), name)}
        view={(view as WithRepeatedView).repeatedView}
      />}
      form={form}
      sharedData={sharedData}
      model={model}
      submit={submit}
    >
      {content}
    </DynamicComponent>
  );
});

export const NestedForm = memo<{ views: View[]; name: string }>(({ views, name }) => {
  return (
    <>
      {views.map((view, id) => (
        <FieldResolver key={`${id}-${view.type}-${(view as FieldView).name}`} name={updateNameWithNestedValue((view as FieldView).name, name)} view={view} />
      ))}
    </>
  );
});

export const createDynamicViews = ({ types = {}, validators = {}, asyncValidators = {}, extensions = {} }: CreateDynamicViewsInput = {}) => {
  const TYPES = types;
  const VALIDATORS = validators;
  const ASYNC_VALIDATORS = asyncValidators;
  const EXTENSIONS = extensions;

  const Component = ({ views, model = null, sharedData = null, onSubmit = () => {} }: DynamicViewsComponentInput) => {
    const defaultModel = useSignal({});
    const defaultSharedData = useSignal({});

    const form = useForm({
      defaultValues: (model || defaultModel).value,
      mode: 'all',
    });

    const submit = useCallback(() => form.handleSubmit(onSubmit)(), [form, onSubmit]);

    const updateFormWithModel = useCallback(() => {
      const modelValue = (model || defaultModel).value;
      const formValue = form.getValues();

      if (JSON.stringify(formValue) !== JSON.stringify(modelValue)) {
        form.reset(modelValue, {
          keepTouched: true,
          keepDirty: true,
        });
      }
    }, [model, form, defaultModel]);

    useEffect(() => {
      if (!model) {
        return;
      }

      updateFormWithModel();

      return (model || defaultModel).subscribe(updateFormWithModel);
    }, [model, form, defaultModel, updateFormWithModel]);

    const dynamicViewsContextValue = useMemo<ContextValue>(
      () => ({
        model: model || defaultModel,
        form,
        sharedData: sharedData || defaultSharedData,
        submit,
        TYPES,
        VALIDATORS,
        ASYNC_VALIDATORS,
        EXTENSIONS,
      }),
      [model, defaultModel, form, sharedData, defaultSharedData, submit],
    );

    return (
      <FormProvider {...form}>
        <DynamicViewsContext.Provider value={dynamicViewsContextValue}>
          <NestedForm views={views} name={''} />
        </DynamicViewsContext.Provider>
      </FormProvider>
    );
  };

  Component.defineTypes = (types: Array<DefinitionItem<TypeComponent>>) => {
    types.forEach(({ name, item: component }) => {
      TYPES[name] = component;
    });
  };

  Component.defineValidators = (validators: Array<DefinitionItem<ValidatorFunction>>) => {
    validators.forEach(({ name, item: validator }) => {
      VALIDATORS[name] = validator;
    });
  };

  Component.defineAsyncValidators = (validators: Array<DefinitionItem<AsyncValidatorFunction>>) => {
    validators.forEach(({ name, item: asyncValidator }) => {
      ASYNC_VALIDATORS[name] = asyncValidator;
    });
  };

  Component.defineExtensions = (extensions: Array<DefinitionItem<ExtensionFunction>>) => {
    extensions.forEach(({ name, item: extension }) => {
      EXTENSIONS[name] = extension;
    });
  };

  return Component;
};
