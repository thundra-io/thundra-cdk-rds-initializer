import {CloudFormationCustomResourceDeleteEvent} from 'aws-lambda';
import {CustomResourceHandler} from '../base';

export class DatabaseUserInitializerDeleteHandler extends CustomResourceHandler<CloudFormationCustomResourceDeleteEvent> {
    public async consumeEvent() {
        console.log('No resource has been changed.');
        return {
            physicalResourceId: this.event.PhysicalResourceId,
            data: {},
        };
    }
}
