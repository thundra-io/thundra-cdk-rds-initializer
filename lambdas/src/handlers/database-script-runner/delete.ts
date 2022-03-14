import {CloudFormationCustomResourceDeleteEvent} from 'aws-lambda';
import {CustomResourceHandler} from '../base';

export class DatabaseScriptRunnerDeleteHandler extends CustomResourceHandler<CloudFormationCustomResourceDeleteEvent> {
    public async consumeEvent() {
        console.log('No resource has been changed.');
        return {
            physicalResourceId: this.event.PhysicalResourceId,
            data: {},
        };
    }
}
