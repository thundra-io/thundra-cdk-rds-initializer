import { CloudFormationCustomResourceDeleteEvent } from 'aws-lambda';
import { CustomResourceHandler } from '../base';

export class DatabaseUserInitializerDeleteHandler extends CustomResourceHandler<CloudFormationCustomResourceDeleteEvent> {
  public async consumeEvent() {
    console.log('We do not need to make any changes for the deletion event');
    return {
      physicalResourceId: this.event.PhysicalResourceId,
      data: {},
    };
  }
}
