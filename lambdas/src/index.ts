import { CloudFormationCustomResourceEvent } from "aws-lambda";

import {
  CustomResourceHandler,
  DatabaseScriptRunnerCreateHandler,
  DatabaseScriptRunnerDeleteHandler,
  DatabaseScriptRunnerUpdateHandler,
  DatabaseUserInitializerCreateHandler,
  DatabaseUserInitializerDeleteHandler,
  DatabaseUserInitializerUpdateHandler
} from "./handlers";

export async function databaseUserInitializerHandler(event: CloudFormationCustomResourceEvent) {
  const handler: CustomResourceHandler = (() => {
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));
    switch (event.RequestType) {
      case "Create":
        return new DatabaseUserInitializerCreateHandler(event);
      case "Update":
        return new DatabaseUserInitializerUpdateHandler(event);
      case "Delete":
        return new DatabaseUserInitializerDeleteHandler(event);
    }
  })();

  return await handler.handleEvent();
}

export async function databaseScriptRunnerHandler(event: CloudFormationCustomResourceEvent) {
  const handler: CustomResourceHandler = (() => {
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));
    switch (event.RequestType) {
      case "Create":
        return new DatabaseScriptRunnerCreateHandler(event);
      case "Update":
        return new DatabaseScriptRunnerUpdateHandler(event);
      case "Delete":
        return new DatabaseScriptRunnerDeleteHandler(event);
    }
  })();

  return await handler.handleEvent();
}
