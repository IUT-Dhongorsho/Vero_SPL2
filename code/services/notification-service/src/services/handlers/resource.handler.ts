export class ResourceHandler {
  async handle(event: any) {
    console.log('Handling Resource Event:', event.type);
  }
}
export const resourceHandler = new ResourceHandler();
