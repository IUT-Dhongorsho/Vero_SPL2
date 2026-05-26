export class NoteHandler {
  async handle(event: any) {
    console.log('Handling Note Event:', event.type);
  }
}
export const noteHandler = new NoteHandler();
