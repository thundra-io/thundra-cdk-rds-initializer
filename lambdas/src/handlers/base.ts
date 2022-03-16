import {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceEventCommon,
    CloudFormationCustomResourceResponse
} from "aws-lambda";

type ConsumeEventResult = {
    physicalResourceId: CloudFormationCustomResourceResponse["PhysicalResourceId"];
    data: CloudFormationCustomResourceResponse["Data"];
};

type EventBase = CloudFormationCustomResourceEventCommon & { PhysicalResourceId?: string };

export abstract class CustomResourceHandler<T extends EventBase = CloudFormationCustomResourceEvent> {
    public constructor(protected readonly event: T) {
    }

    public async handleEvent() {
        try {
            const {physicalResourceId, data} = await this.consumeEvent();
            console.log(`Custom resource event completed successfuly...`);
            return {
                Status: "SUCCESS",
                PhysicalResourceId: physicalResourceId,
                StackId: this.event.StackId,
                RequestId: this.event.RequestId,
                LogicalResourceId: this.event.LogicalResourceId,
                Data: data,
            };
        } catch (e) {
            console.error('Error occurred while handling custom resource event: ' + e.message)
            throw e;
        }
    }

    protected abstract consumeEvent(): Promise<ConsumeEventResult>;
}
