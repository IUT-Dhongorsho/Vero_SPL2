export class ProjectHandler {
  async handle(event: any) {
    console.log('Handling Project Event:', event.type);
  }
}
export const projectHandler = new ProjectHandler();
